import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpiredOrder {
  order_id: string;
  order_number: string;
  created_at: string;
  payment_expires_at: string;
  minutes_expired: number;
}

interface CancellationResult {
  total_expired: number;
  total_cancelled: number;
  cancelled_orders: string[];
  errors: Array<{ order_id: string; error: string }>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🕐 Starting expired orders cancellation process...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar pedidos expirados
    console.log('🔍 Searching for expired orders...');
    const { data: expiredOrders, error: fetchError } = await supabase
      .rpc('get_expired_orders');

    if (fetchError) {
      console.error('❌ Error fetching expired orders:', fetchError);
      throw fetchError;
    }

    const totalExpired = expiredOrders?.length || 0;
    console.log(`📊 Found ${totalExpired} expired orders`);

    if (totalExpired === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No expired orders found',
          result: {
            total_expired: 0,
            total_cancelled: 0,
            cancelled_orders: [],
            errors: []
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cancelar cada pedido
    const cancelledOrders: string[] = [];
    const errors: Array<{ order_id: string; error: string }> = [];

    for (const order of expiredOrders as ExpiredOrder[]) {
      console.log(`⏱️ Cancelling order ${order.order_number} (expired ${order.minutes_expired} minutes ago)...`);
      
      const { data: cancelled, error: cancelError } = await supabase
        .rpc('cancel_expired_order', { p_order_id: order.order_id });

      if (cancelError) {
        console.error(`❌ Failed to cancel order ${order.order_number}:`, cancelError);
        errors.push({
          order_id: order.order_id,
          error: cancelError.message
        });
      } else if (cancelled) {
        console.log(`✅ Order ${order.order_number} cancelled successfully`);
        cancelledOrders.push(order.order_number);
      } else {
        console.warn(`⚠️ Order ${order.order_number} was not cancelled (possibly already updated)`);
      }
    }

    const result: CancellationResult = {
      total_expired: totalExpired,
      total_cancelled: cancelledOrders.length,
      cancelled_orders: cancelledOrders,
      errors
    };

    console.log('✨ Cancellation process completed!');
    console.log('📊 Summary:', {
      total_expired: totalExpired,
      total_cancelled: cancelledOrders.length,
      errors_count: errors.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cancellation process completed',
        result
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Cancellation process failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
