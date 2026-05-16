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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Autenticar usuário via JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que o pedido pertence ao usuário autenticado
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, order_number, customer_email, reseller_id')
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Confirmar pedido como pago via carteira (service role bypassa RLS)
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'recebido',
        payment_status: 'paid',
        payment_method: 'wallet',
      })
      .eq('id', order_id);

    if (updateError) {
      console.error('[complete-wallet-payment] Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update order' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Registrar histórico
    await supabase.from('order_status_history').insert({
      order_id,
      status: 'recebido',
      notes: 'Pagamento confirmado com saldo da carteira',
    }).catch(() => {});

    // Disparar split de pagamento de forma assíncrona
    supabase.functions.invoke('process-payment-split', {
      body: { order_id },
    }).catch((e: Error) => console.error('[complete-wallet-payment] Split failed:', e));

    // Disparar evento order.paid para webhooks registrados (n8n, etc.)
    supabase.functions.invoke('dispatch-webhook', {
      body: {
        event_type: 'order.paid',
        payload: {
          order_id,
          order_number: order.order_number,
          payment_method: 'wallet',
        },
      },
    }).catch((e: Error) => console.error('[complete-wallet-payment] Webhook dispatch failed:', e));

    console.log(`[complete-wallet-payment] ✅ Order ${order.order_number} confirmed as wallet payment`);
    return new Response(
      JSON.stringify({ success: true, order_id, order_number: order.order_number }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[complete-wallet-payment] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
