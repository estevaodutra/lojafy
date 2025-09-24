import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface PixPaymentRequest {
  amount: number;
  description: string;
  payer: {
    email: string;
    firstName: string;
    lastName: string;
    cpf: string;
  };
  orderItems: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
  shippingAddress: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Iniciando criação de pagamento PIX');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    console.log('Authorization header presente:', !!authHeader);
    
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract and validate token format
    const token = authHeader.replace('Bearer ', '');
    console.log('Token format válido:', token.length > 0 && token !== authHeader);
    
    // Since JWT verification is disabled, we'll use the anon client to verify
    const anonSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    
    const { data: { user }, error: authError } = await anonSupabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Authentication error:', authError);
      console.log('Token recebido (primeiros 20 chars):', token.substring(0, 20) + '...');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid authentication', 
          details: authError?.message || 'User not found' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Usuário autenticado com sucesso:', user.id);

    const { amount, description, payer, orderItems, shippingAddress }: PixPaymentRequest = await req.json();
    
    console.log('Dados recebidos:', { amount, description, payer: { ...payer, cpf: '***' } });

    // Validate required fields
    if (!amount || !payer.email || !payer.cpf) {
      console.error('Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, email, cpf' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate unique external reference
    const externalReference = `order_${Date.now()}_${user.id.substring(0, 8)}`;
    
    // Fetch complete user profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
    }

    // Fetch complete product information
    let completeProducts = [];
    if (orderItems && orderItems.length > 0) {
      const productIds = orderItems.map(item => item.productId);
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id (
            id,
            name,
            slug
          ),
          subcategories:subcategory_id (
            id,
            name,
            slug
          )
        `)
        .in('id', productIds);

      if (productsError) {
        console.error('Error fetching products:', productsError);
      } else {
        completeProducts = orderItems.map(orderItem => {
          const product = productsData?.find(p => p.id === orderItem.productId);
          return {
            id: orderItem.productId,
            nome: orderItem.productName,
            descricao_completa: product?.description || '',
            preco_unitario: orderItem.unitPrice,
            quantidade: orderItem.quantity,
            valor_total_item: orderItem.quantity * orderItem.unitPrice,
            marca: product?.brand || '',
            sku: product?.sku || '',
            gtin_ean13: product?.gtin_ean13 || '',
            categoria: product?.categories?.name || '',
            subcategoria: product?.subcategories?.name || '',
            especificacoes: '',
            dimensoes: {
              peso: product?.weight || 0,
              altura: product?.height || 0,
              largura: product?.width || 0,
              comprimento: product?.length || 0
            },
            imagem_principal: product?.main_image_url || product?.image_url || '',
            estoque_atual: product?.stock_quantity || 0,
            avaliacao: product?.rating || 0,
            numero_avaliacoes: product?.review_count || 0
          };
        });
      }
    }

    // Prepare complete payload for N8N webhook
    const n8nPayload = {
      pedido: {
        external_reference: externalReference,
        timestamp: new Date().toISOString(),
        valor_total: amount,
        descricao: description || `Pedido - ${externalReference}`,
        quantidade_itens: orderItems?.length || 0
      },
      cliente: {
        user_id: user.id,
        nome_completo: `${payer.firstName || ''} ${payer.lastName || ''}`.trim(),
        email: payer.email,
        telefone: profileData?.phone || '',
        cpf: payer.cpf.replace(/\D/g, ''),
        endereco: shippingAddress ? {
          rua: shippingAddress.street || '',
          numero: shippingAddress.number || '',
          complemento: shippingAddress.complement || '',
          bairro: shippingAddress.neighborhood || '',
          cidade: shippingAddress.city || '',
          estado: shippingAddress.state || '',
          uf: shippingAddress.state || '',
          cep: shippingAddress.zip_code || ''
        } : null
      },
      produtos: completeProducts,
      pagamento: {
        metodo: 'pix',
        valor: amount
      }
    };

    console.log('Enviando para N8N webhook:', { 
      ...n8nPayload, 
      cliente: { ...n8nPayload.cliente, cpf: '***' } 
    });

    // Send to N8N webhook
    const n8nResponse = await fetch('https://n8n-n8n.nuwfic.easypanel.host/webhook/gerar_pix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    const n8nResult = await n8nResponse.json();
    console.log('Resposta N8N:', { status: n8nResponse.status, data: n8nResult });

    if (!n8nResponse.ok) {
      console.error('N8N webhook error:', n8nResult);
      return new Response(
        JSON.stringify({ 
          error: 'PIX generation failed', 
          details: n8nResult.message || 'N8N webhook error' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // N8N returns an array, extract the first PIX data
    let pixData;
    if (Array.isArray(n8nResult) && n8nResult.length > 0) {
      pixData = n8nResult[0];
    } else if (n8nResult && typeof n8nResult === 'object') {
      pixData = n8nResult;
    } else {
      console.error('Invalid N8N response format:', n8nResult);
      return new Response(
        JSON.stringify({ error: 'Invalid PIX response format from N8N' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate N8N response has required PIX data
    if (!pixData.qrCodeBase64 || !pixData.qrCodeCopyPaste) {
      console.error('Missing PIX data in N8N response:', pixData);
      return new Response(
        JSON.stringify({ error: 'PIX QR code data not available from N8N' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate order number
    const orderNumber = externalReference.toUpperCase().replace('ORDER_', 'ORD-');
    console.log('Generated order number:', orderNumber);

    // Create order in database with N8N response data
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: amount,
        payment_method: 'pix',
        payment_status: 'pending',
        status: 'pending',
        payment_id: pixData.paymentId || externalReference,
        pix_qr_code: pixData.qrCodeCopyPaste,
        pix_qr_code_base64: pixData.qrCodeBase64,
        shipping_address: shippingAddress,
        external_reference: externalReference
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items
    if (orderItems && orderItems.length > 0) {
      const orderItemsData = orderItems.map(item => ({
        order_id: orderData.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
        product_snapshot: {
          name: item.productName,
          price: item.unitPrice
        }
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) {
        console.error('Error creating order items:', itemsError);
      }
    }

    // Return PIX payment data from N8N
    const responseData = {
      order_id: orderData.id,
      payment_id: pixData.paymentId || externalReference,
      status: 'pending',
      qr_code: pixData.qrCodeCopyPaste,
      qr_code_base64: pixData.qrCodeBase64,
      ticket_url: '',
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min expiration
      external_reference: externalReference
    };

    console.log('PIX payment criado com sucesso via N8N:', { order_id: responseData.order_id, payment_id: responseData.payment_id });

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-pix-payment:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});