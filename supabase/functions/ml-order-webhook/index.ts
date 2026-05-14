import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getTokenForMlUser(mlUserId: number): Promise<string | null> {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('access_token, refresh_token, expires_at, user_id')
    .eq('ml_user_id', mlUserId)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  // Check expiry
  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
    // Refresh via edge function
    const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
      body: { user_id: data.user_id },
    });
    return refreshData?.access_token ?? data.access_token;
  }

  return data.access_token;
}

async function getResellerUserId(mlUserId: number): Promise<string | null> {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('user_id')
    .eq('ml_user_id', mlUserId)
    .eq('is_active', true)
    .single();
  return data?.user_id ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log('[ml-order-webhook] Received:', JSON.stringify(body));

    const { topic, resource, user_id: mlUserId } = body;

    // ML sends a ping notification on subscription — respond OK
    if (!topic || !resource) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only process order notifications
    if (topic !== 'orders_v2' && topic !== 'orders') {
      console.log('[ml-order-webhook] Ignoring topic:', topic);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract order ID from resource path: "/orders/123456"
    const orderIdMatch = resource.match(/\/orders\/(\d+)/);
    if (!orderIdMatch) {
      console.error('[ml-order-webhook] Could not extract order ID from:', resource);
      return new Response(JSON.stringify({ error: 'Invalid resource' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const mlOrderId = orderIdMatch[1];

    // Idempotência: verificar se pedido já foi processado
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('payment_id', `ml_${mlOrderId}`)
      .maybeSingle();

    if (existingOrder) {
      console.log(`[ml-order-webhook] Order ml_${mlOrderId} already processed`);
      return new Response(JSON.stringify({ ok: true, already_processed: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get access token for this ML user
    const accessToken = await getTokenForMlUser(mlUserId);
    if (!accessToken) {
      console.error('[ml-order-webhook] No integration found for ML user', mlUserId);
      return new Response(JSON.stringify({ error: 'Integration not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resellerUserId = await getResellerUserId(mlUserId);

    // Fetch order details from ML API
    const orderRes = await fetch(`https://api.mercadolibre.com/orders/${mlOrderId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!orderRes.ok) {
      console.error('[ml-order-webhook] Failed to fetch order:', orderRes.status);
      return new Response(JSON.stringify({ error: 'Failed to fetch ML order' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mlOrder = await orderRes.json();
    console.log('[ml-order-webhook] ML Order status:', mlOrder.status, 'id:', mlOrderId);

    // Only process paid orders
    if (mlOrder.status !== 'paid') {
      console.log('[ml-order-webhook] Order not paid yet, status:', mlOrder.status);
      return new Response(JSON.stringify({ ok: true, status: mlOrder.status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const buyer = mlOrder.buyer;
    const totalAmount = mlOrder.total_amount;
    const orderItems = mlOrder.order_items ?? [];

    // Create order in our database
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        reseller_id: resellerUserId,
        customer_name: `${buyer?.first_name ?? ''} ${buyer?.last_name ?? ''}`.trim() || 'Comprador ML',
        customer_email: buyer?.email ?? null,
        customer_phone: buyer?.phone?.number ?? null,
        total_amount: totalAmount,
        payment_method: 'mercadolivre',
        payment_status: 'paid',
        status: 'recebido',
        payment_id: `ml_${mlOrderId}`,
        external_reference: `ml_order_${mlOrderId}`,
        notes: `Pedido via Mercado Livre #${mlOrderId}`,
      })
      .select('id, order_number')
      .single();

    if (orderError) {
      console.error('[ml-order-webhook] Failed to create order:', orderError);
      return new Response(JSON.stringify({ error: 'Failed to create order' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create order items
    for (const item of orderItems) {
      const mlItemId = item.item?.id;
      const unitPrice = item.unit_price;
      const quantity = item.quantity;

      // Try to find our product by ml_item_id
      const { data: publishedProduct } = await supabase
        .from('mercadolivre_published_products')
        .select('product_id')
        .eq('ml_item_id', mlItemId)
        .maybeSingle();

      if (publishedProduct?.product_id) {
        const { data: product } = await supabase
          .from('products')
          .select('id, name, cost_price, supplier_id')
          .eq('id', publishedProduct.product_id)
          .single();

        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_id: publishedProduct.product_id,
          quantity,
          unit_price: unitPrice,
          product_snapshot: {
            name: item.item?.title ?? product?.name ?? 'Produto ML',
            ml_item_id: mlItemId,
          },
        });
      } else {
        // Product not in our catalog — store as external item
        await supabase.from('order_items').insert({
          order_id: newOrder.id,
          product_id: null,
          quantity,
          unit_price: unitPrice,
          product_snapshot: {
            name: item.item?.title ?? 'Produto ML',
            ml_item_id: mlItemId,
          },
        });
      }
    }

    // Status history
    await supabase.from('order_status_history').insert({
      order_id: newOrder.id,
      status: 'recebido',
      notes: `Pedido recebido via Mercado Livre #${mlOrderId}`,
    });

    // Dispatch split payment
    supabase.functions.invoke('process-payment-split', {
      body: { order_id: newOrder.id },
    }).catch((e: Error) => console.error('[ml-order-webhook] Split failed:', e));

    // Notify reseller
    if (resellerUserId) {
      await supabase.from('notifications').insert({
        user_id: resellerUserId,
        title: '🛒 Novo pedido no Mercado Livre!',
        message: `Pedido #${newOrder.order_number} — R$ ${Number(totalAmount).toFixed(2)} recebido.`,
        type: 'new_order',
        action_url: '/reseller/pedidos',
        action_label: 'Ver Pedido',
      });
    }

    console.log(`✅ [ml-order-webhook] Order ${newOrder.order_number} created from ML #${mlOrderId}`);
    return new Response(
      JSON.stringify({ success: true, order_id: newOrder.id, order_number: newOrder.order_number }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[ml-order-webhook] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
