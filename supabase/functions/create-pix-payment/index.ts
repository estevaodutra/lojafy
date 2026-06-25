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

const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';

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
  reseller_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    if (!MP_ACCESS_TOKEN) {
      console.warn('MERCADO_PAGO_ACCESS_TOKEN not configured, proceeding with webhook payment creation');
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { amount, description, payer, orderItems, shippingAddress, reseller_id }: PixPaymentRequest = await req.json();

    if (!amount || !payer?.email || !payer?.cpf) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: amount, email, cpf' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const externalReference = `order_${Date.now()}_${user.id.substring(0, 8)}`;
    const notificationUrl = `${SUPABASE_URL}/functions/v1/webhook-mercadopago`;

    // Build N8N payload (compatible format)
    const n8nPayload = {
      amount,
      description: description || `Pedido Lojafy - ${externalReference}`,
      payer,
      orderItems,
      shippingAddress,
      reseller_id,
      externalReference,
      notificationUrl,

      // Structured format for compatibility with wallet-recharge style consumers
      pedido: {
        external_reference: externalReference,
        timestamp: new Date().toISOString(),
        valor_total: Number(amount),
        descricao: description || `Pedido Lojafy - ${externalReference}`,
        quantidade_itens: orderItems?.reduce((acc, i) => acc + i.quantity, 0) || 1,
      },
      cliente: {
        user_id: user.id,
        nome_completo: `${payer.firstName || ''} ${payer.lastName || ''}`.trim(),
        email: payer.email,
        telefone: '',
        cpf: payer.cpf.replace(/\D/g, ''),
        endereco: shippingAddress ?? null,
      },
      produtos: orderItems?.map(item => ({
        id: item.productId,
        nome: item.productName,
        preco_unitario: Number(item.unitPrice),
        quantidade: Number(item.quantity),
        valor_total_item: Number(item.quantity) * Number(item.unitPrice),
      })) || [],
      pagamento: {
        metodo: 'pix',
        valor: Number(amount),
      },
    };

    const webhookUrl = 'https://n8n.6ksfuf.easypanel.host/webhook/generate_payment';
    console.log('[pix] Calling webhook for PIX payment:', webhookUrl);

    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(n8nPayload),
    });

    const responseText = await webhookRes.text();
    console.log('[pix] Webhook Response Status:', webhookRes.status);

    let n8nResult: any;
    try {
      n8nResult = JSON.parse(responseText);
    } catch {
      console.error('[pix] Failed to parse webhook response:', responseText);
      return new Response(
        JSON.stringify({ error: 'Invalid response from payment webhook' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!webhookRes.ok) {
      console.error('[pix] Webhook error:', webhookRes.status, JSON.stringify(n8nResult));
      return new Response(
        JSON.stringify({ error: 'Payment webhook error', details: n8nResult }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse response
    let pixData: any;
    if (Array.isArray(n8nResult) && n8nResult.length > 0) {
      pixData = n8nResult[0];
    } else if (n8nResult && typeof n8nResult === 'object') {
      pixData = n8nResult;
    } else {
      console.error('[pix] Invalid webhook response format:', n8nResult);
      return new Response(
        JSON.stringify({ error: 'Invalid PIX response format from webhook' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qrCode = pixData.qrCodeCopyPaste ?? pixData.qr_code ?? null;
    const qrCodeBase64 = pixData.qrCodeBase64 ?? pixData.qr_code_base64 ?? null;
    const paymentId = pixData.paymentId ? String(pixData.paymentId) : null;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    if (!qrCode || !paymentId) {
      console.error('[pix] Missing required fields in webhook response:', pixData);
      return new Response(
        JSON.stringify({ error: 'PIX QR code or Payment ID not returned by webhook' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar order number sequencial via banco
    const { data: orderNumData } = await supabase.rpc('generate_order_number');
    const orderNumber = orderNumData as string;

    // Criar pedido no banco
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: user.id,
        reseller_id: reseller_id ?? null,
        total_amount: amount,
        payment_method: 'pix',
        payment_status: 'pending',
        status: 'pendente',
        payment_id: paymentId,
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
        shipping_address: shippingAddress ?? null,
        external_reference: externalReference,
        payment_expires_at: expiresAt,
      })
      .select()
      .single();

    if (orderError) {
      console.error('[pix] Failed to create order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Failed to create order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar order items
    if (orderItems?.length > 0) {
      const productIds = orderItems.map(i => i.productId);
      const { data: products } = await supabase
        .from('products')
        .select('id, cost_price, image_url, brand, sku, supplier_id')
        .in('id', productIds);

      const itemsData = orderItems.map(item => {
        const p = products?.find(x => x.id === item.productId);
        return {
          order_id: orderData.id,
          product_id: item.productId,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          total_price: item.quantity * item.unitPrice,
          product_snapshot: {
            name: item.productName,
            price: item.unitPrice,
            cost_price: p?.cost_price ?? 0,
            image_url: p?.image_url ?? null,
            brand: p?.brand ?? null,
            sku: p?.sku ?? null,
            supplier_id: p?.supplier_id ?? null,
          },
        };
      });

      const { error: itemsError } = await supabase.from('order_items').insert(itemsData);
      if (itemsError) console.error('[pix] Failed to create order items:', itemsError);
    }

    console.log(`✅ [pix] PIX created — order ${orderData.order_number}, payment_id ${paymentId}`);

    return new Response(
      JSON.stringify({
        order_id: orderData.id,
        payment_id: paymentId,
        status: 'pending',
        qr_code: qrCode,
        qr_code_base64: qrCodeBase64,
        ticket_url: pixData.ticket_url ?? pixData.point_of_interaction?.transaction_data?.ticket_url ?? '',
        expires_at: expiresAt,
        external_reference: externalReference,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[pix] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
