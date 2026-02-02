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

interface DispatchRequest {
  order_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_id }: DispatchRequest = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'order_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Disparando webhook manual para pedido:', order_id);

    // Buscar pedido completo
    const { data: fullOrder, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          product_snapshot
        )
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !fullOrder) {
      console.error('❌ Pedido não encontrado:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found', details: orderError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o pedido está pago
    if (fullOrder.payment_status !== 'paid') {
      console.log('⚠️ Pedido não está pago:', fullOrder.payment_status);
      return new Response(
        JSON.stringify({ 
          error: 'Order is not paid', 
          payment_status: fullOrder.payment_status,
          order_number: fullOrder.order_number
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados do cliente ou usar dados do pedido (visitantes)
    let customerData = null;
    if (fullOrder.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone')
        .eq('user_id', fullOrder.user_id)
        .single();
      
      if (profile) {
        const { data: authUser } = await supabase.auth.admin.getUserById(fullOrder.user_id);
        customerData = {
          user_id: profile.user_id,
          email: authUser?.user?.email || null,
          name: [profile.first_name, profile.last_name].filter(Boolean).join(' ') || null,
          phone: profile.phone,
        };
      }
    } else {
      // Pedidos de visitantes - usar dados do próprio pedido
      customerData = {
        user_id: null,
        email: fullOrder.customer_email || null,
        name: fullOrder.customer_name || null,
        phone: fullOrder.customer_phone || null,
      };
    }

    // Buscar dados do revendedor (se houver)
    let resellerData = null;
    if (fullOrder.reseller_id) {
      const { data: resellerStore } = await supabase
        .from('reseller_stores')
        .select('user_id, store_name')
        .eq('user_id', fullOrder.reseller_id)
        .single();
      
      if (resellerStore) {
        resellerData = {
          user_id: resellerStore.user_id,
          store_name: resellerStore.store_name,
        };
      }
    }

    const webhookPayload = {
      order_id: fullOrder.id,
      order_number: fullOrder.order_number,
      total_amount: fullOrder.total_amount,
      payment_method: fullOrder.payment_method || 'pix',
      customer: customerData,
      reseller: resellerData,
      items: fullOrder.order_items?.map((item: any) => ({
        product_id: item.product_id,
        name: item.product_snapshot?.name || 'Produto',
        sku: item.product_snapshot?.sku || null,
        image_url: item.product_snapshot?.image_url || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
      })) || [],
    };

    console.log('📦 Payload do webhook:', JSON.stringify(webhookPayload, null, 2));

    // Disparar o webhook
    const { data: dispatchResult, error: dispatchError } = await supabase.functions.invoke('dispatch-webhook', {
      body: {
        event_type: 'order.paid',
        payload: webhookPayload,
      },
    });

    if (dispatchError) {
      console.error('❌ Erro ao disparar webhook:', dispatchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to dispatch webhook', 
          details: dispatchError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Webhook order.paid disparado manualmente com sucesso');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook dispatched successfully',
        order_id: fullOrder.id,
        order_number: fullOrder.order_number,
        dispatch_result: dispatchResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
