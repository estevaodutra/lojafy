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
      console.error('MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Payment service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Chamar MP API diretamente
    const mpPayload = {
      transaction_amount: Number(amount),
      description: description || `Pedido Lojafy - ${externalReference}`,
      payment_method_id: 'pix',
      payer: {
        email: payer.email,
        first_name: payer.firstName || '',
        last_name: payer.lastName || '',
        identification: {
          type: 'CPF',
          number: payer.cpf.replace(/\D/g, ''),
        },
      },
      external_reference: externalReference,
      notification_url: notificationUrl,
      date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min
    };

    console.log('[pix] Calling MP API for PIX payment, amount:', amount);

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': externalReference,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('[pix] MP API error:', mpRes.status, JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: mpData?.message ?? 'Mercado Pago API error', mp_error: mpData }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code ?? null;
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
    const paymentId = String(mpData.id);
    const expiresAt = mpData.date_of_expiration ?? new Date(Date.now() + 30 * 60 * 1000).toISOString();

    if (!qrCode) {
      console.error('[pix] No QR code in MP response:', JSON.stringify(mpData));
      return new Response(
        JSON.stringify({ error: 'PIX QR code not returned by Mercado Pago' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar order number
    const orderNumber = externalReference.toUpperCase().replace('ORDER_', 'ORD-');

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
        ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url ?? '',
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
