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
    
    const { amount, description, payer, orderItems, shippingAddress }: PixPaymentRequest = await req.json();
    
    // Since verify_jwt = false, we don't require authentication but try to get user if available
    let user = null;
    let userId = null;
    
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
        
        if (!authError && authUser) {
          user = authUser;
          userId = authUser.id;
          console.log('Usuário autenticado:', userId);
        } else {
          console.log('Token inválido ou usuário não encontrado, continuando sem autenticação');
        }
      } catch (authError) {
        console.log('Erro na autenticação, continuando sem autenticação:', authError);
      }
    }
    
    // Generate fallback user ID if no authentication
    if (!userId) {
      userId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Usando ID de usuário temporário:', userId);
    }
    
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
    const externalReference = `order_${Date.now()}_${userId.substring(0, 8)}`;
    
    // Fetch complete user profile data (only if authenticated)
    let profileData = null;
    if (user) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.log('User profile not found, continuing without profile data:', profileError.message);
      } else {
        profileData = profile;
      }
    }

    // Fetch complete product information
    let completeProducts: any[] = [];
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
        user_id: userId,
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

    // URLs do webhook N8N (configuráveis via secrets)
    const primaryWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || 'https://n8n-n8n.nuwfic.easypanel.host/webhook/gerar_pix';
    const testWebhookUrl = Deno.env.get('N8N_WEBHOOK_TEST_URL') || 'https://n8n-n8n.nuwfic.easypanel.host/webhook-test/gerar_pix';
    
    console.log('Primary webhook URL:', primaryWebhookUrl);
    console.log('Test webhook URL:', testWebhookUrl);
    
    let n8nResult: any;
    let lastError = null;
    
    // Tentativa 1: Webhook de produção
    try {
      console.log('Tentando webhook de produção...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const n8nResponse = await fetch(primaryWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      console.log('N8N Response Status (Primary):', n8nResponse.status);
      console.log('N8N Response Headers (Primary):', Object.fromEntries(n8nResponse.headers.entries()));

      const responseText = await n8nResponse.text();
      console.log('N8N Raw Response (Primary):', responseText);
      
      try {
        n8nResult = JSON.parse(responseText);
        console.log('N8N Parsed Response (Primary):', n8nResult);
      } catch (parseError) {
        console.error('Erro ao fazer parse da resposta do N8N (Primary):', parseError);
        throw new Error('N8N retornou resposta inválida');
      }

      // Se foi sucesso, seguir em frente
      if (n8nResponse.ok) {
        console.log('Webhook de produção respondeu com sucesso');
      } else if (n8nResponse.status === 404 && (n8nResult.message?.includes('not registered') || n8nResult.code === 404)) {
        // Webhook não registrado, tentar o de teste
        console.log('Webhook de produção não registrado, tentando webhook de teste...');
        throw new Error('WEBHOOK_NOT_REGISTERED');
      } else {
        // Outro erro, não tentar fallback
        console.error('N8N webhook error (Primary). Status:', n8nResponse.status);
        console.error('N8N error response (Primary):', n8nResult);
        throw new Error(`N8N webhook failed with status ${n8nResponse.status}`);
      }
      
    } catch (error) {
      lastError = error;
      console.log('Erro no webhook primário:', error instanceof Error ? error.message : String(error));
      
      // Se foi erro de webhook não registrado, tentar o de teste
      if (error instanceof Error && error.message === 'WEBHOOK_NOT_REGISTERED') {
        try {
          console.log('Tentando webhook de teste...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);
          
          const n8nResponse = await fetch(testWebhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(n8nPayload),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          console.log('N8N Response Status (Test):', n8nResponse.status);
          console.log('N8N Response Headers (Test):', Object.fromEntries(n8nResponse.headers.entries()));

          const responseText = await n8nResponse.text();
          console.log('N8N Raw Response (Test):', responseText);
          
          try {
            n8nResult = JSON.parse(responseText);
            console.log('N8N Parsed Response (Test):', n8nResult);
          } catch (parseError) {
            console.error('Erro ao fazer parse da resposta do N8N (Test):', parseError);
            throw new Error('N8N retornou resposta inválida');
          }

          if (!n8nResponse.ok) {
            if (n8nResponse.status === 404 && (n8nResult.message?.includes('not registered') || n8nResult.code === 404)) {
              // Ambos webhooks não estão registrados
              throw new Error('WEBHOOK_NOT_REGISTERED');
            } else {
              console.error('N8N webhook error (Test). Status:', n8nResponse.status);
              console.error('N8N error response (Test):', n8nResult);
              throw new Error(`N8N webhook failed with status ${n8nResponse.status}`);
            }
          } else {
            console.log('Webhook de teste respondeu com sucesso');
          }
          
        } catch (testError) {
          console.error('Erro também no webhook de teste:', testError instanceof Error ? testError.message : String(testError));
          throw testError;
        }
      } else if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('PIX_SERVICE_TIMEOUT');
      } else {
        // Outro tipo de erro, não tentar fallback
        throw error;
      }
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
    const orderInsertData: any = {
      order_number: orderNumber,
      total_amount: amount,
      payment_method: 'pix',
      payment_status: 'pending',
      status: 'pendente',
      payment_id: pixData.paymentId || externalReference,
      pix_qr_code: pixData.qrCodeCopyPaste,
      pix_qr_code_base64: pixData.qrCodeBase64,
      shipping_address: shippingAddress,
      external_reference: externalReference,
      payment_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
    };

    // Only add user_id if we have an authenticated user
    if (user) {
      orderInsertData.user_id = user.id;
    }

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(orderInsertData)
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items with cost information
    if (orderItems && orderItems.length > 0) {
      // Fetch cost_price and additional product data for snapshot
      const productIds = orderItems.map(item => item.productId);
      const { data: productsWithCost } = await supabase
        .from('products')
        .select('id, cost_price, image_url, brand, sku')
        .in('id', productIds);

      const orderItemsData = orderItems.map(item => {
        const productData = productsWithCost?.find(p => p.id === item.productId);
        
        return {
          order_id: orderData.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.quantity * item.unitPrice,
          product_snapshot: {
            name: item.productName,
            price: item.unitPrice,
            cost_price: productData?.cost_price || 0,
            image_url: productData?.image_url,
            brand: productData?.brand,
            sku: productData?.sku
          }
        };
      });

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
    
    // Mapear erros específicos para códigos mais informativos
    if (error instanceof Error && error.message === 'WEBHOOK_NOT_REGISTERED') {
      return new Response(
        JSON.stringify({ 
          code: 'WEBHOOK_NOT_REGISTERED',
          error: 'Webhook do N8N não está ativo',
          message: 'O webhook do N8N não está registrado ou ativo. Ative o workflow no N8N ou clique em "Execute workflow" para testar.',
          hint: 'Verifique se o workflow está ativo no N8N ou execute manualmente para teste.'
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (error instanceof Error && error.message === 'PIX_SERVICE_TIMEOUT') {
      return new Response(
        JSON.stringify({ 
          code: 'PIX_SERVICE_TIMEOUT',
          error: 'Timeout do serviço PIX',
          message: 'A requisição para o N8N excedeu o tempo limite de 30 segundos.',
          hint: 'Tente novamente em alguns instantes.'
        }),
        { 
          status: 504, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Falha na criação do pagamento PIX', 
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});