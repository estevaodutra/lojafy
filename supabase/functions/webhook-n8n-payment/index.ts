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

interface N8NPaymentWebhook {
  paymentId: string;
  status: string; // approved, pending, rejected, cancelled
  amount?: number;
  external_reference?: string;
  payment_method?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook N8N de pagamento recebido');
    
    const webhookData: N8NPaymentWebhook = await req.json();
    console.log('N8N webhook data:', {
      paymentId: webhookData.paymentId,
      status: webhookData.status,
      amount: webhookData.amount,
      external_reference: webhookData.external_reference
    });

    // Validate required fields
    if (!webhookData.paymentId || !webhookData.status) {
      console.error('Missing required fields: paymentId or status');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: paymentId and status are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentId = webhookData.paymentId;
    console.log('Processing payment ID:', paymentId);

    // Find order by payment_id
    let orderData: any = null;
    const { data: orderResult, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_id', paymentId)
      .maybeSingle();

    if (orderError) {
      console.error('Error searching for order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Database error while searching for order' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    orderData = orderResult;

    if (!orderData) {
      // Try fallback search by external_reference if provided
      if (webhookData.external_reference) {
        console.log('Trying fallback search by external_reference:', webhookData.external_reference);
        const { data: orderByRef, error: orderByRefError } = await supabase
          .from('orders')
          .select('*')
          .eq('external_reference', webhookData.external_reference)
          .maybeSingle();
        
        if (orderByRefError) {
          console.error('Error searching for order by external_reference:', orderByRefError);
        } else if (orderByRef) {
          orderData = orderByRef;
          console.log('Found order by external_reference:', orderByRef.id);
        }
      }

      if (!orderData) {
        console.error('Order not found for payment ID:', paymentId);
        return new Response(
          JSON.stringify({ error: `Order not found for payment ID: ${paymentId}` }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('Found order:', orderData.id, 'Current status:', orderData.status);

    // Verificar se o pedido já foi pago - evitar disparo duplicado
    if (orderData.payment_status === 'paid') {
      console.log('⚠️ Order already paid, skipping duplicate processing');
      return new Response(
        JSON.stringify({ 
          message: 'Order already paid', 
          order_id: orderData.id,
          order_number: orderData.order_number
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o pedido já foi cancelado por expiração
    if (orderData.status === 'cancelled' && orderData.payment_status === 'expired') {
      console.log('⚠️ Order was already cancelled due to expiration');
      return new Response(
        JSON.stringify({ 
          message: 'Order expired and cancelled', 
          order_id: orderData.id 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map N8N status to our system status
    let newStatus = orderData.status; // Keep current status as default
    let paymentStatus = orderData.payment_status; // Keep current payment status as default

    switch (webhookData.status.toLowerCase()) {
      case 'approved':
        newStatus = 'processing';
        paymentStatus = 'paid';
        console.log('Payment approved - updating to processing status');
        break;
      case 'pending':
        newStatus = 'pending';
        paymentStatus = 'pending';
        console.log('Payment still pending');
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'cancelled';
        paymentStatus = 'failed';
        console.log('Payment rejected/cancelled');
        break;
      default:
        console.log('Unknown payment status:', webhookData.status, '- keeping current status');
    }

    console.log('Updating order status:', { 
      orderId: orderData.id,
      from: { status: orderData.status, payment_status: orderData.payment_status },
      to: { status: newStatus, payment_status: paymentStatus }
    });

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: newStatus,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderData.id);

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update order status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create status history entry
    let historyNotes = `Payment ${webhookData.status} via N8N - Payment ID: ${paymentId}`;
    if (webhookData.amount) {
      historyNotes += ` - Amount: ${webhookData.amount}`;
    }

    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: orderData.id,
        status: newStatus,
        notes: historyNotes
      });

    if (historyError) {
      console.error('Failed to create status history:', historyError);
      // Don't fail the request for history error, just log it
    }

    console.log('Order updated successfully via N8N webhook');

    // Log success for approved payments
    if (webhookData.status.toLowerCase() === 'approved') {
      console.log(`✅ Payment APPROVED for order ${orderData.order_number} - Payment ID: ${paymentId}`);
      
      // Disparar webhook order.paid
      try {
        // Buscar dados completos do pedido para o payload
        const { data: fullOrder } = await supabase
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
          .eq('id', orderData.id)
          .single();

        // Buscar dados do cliente ou usar dados do pedido (visitantes)
        let customerData = null;
        if (fullOrder?.user_id) {
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
            email: fullOrder?.customer_email || null,
            name: fullOrder?.customer_name || null,
            phone: fullOrder?.customer_phone || null,
          };
        }

        // Buscar dados do revendedor (se houver)
        let resellerData = null;
        if (fullOrder?.reseller_id) {
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
          order_id: fullOrder?.id,
          order_number: fullOrder?.order_number,
          total_amount: fullOrder?.total_amount,
          payment_method: fullOrder?.payment_method || 'pix',
          customer: customerData,
          reseller: resellerData,
          items: fullOrder?.order_items?.map((item: any) => ({
            product_id: item.product_id,
            name: item.product_snapshot?.name || 'Produto',
            sku: item.product_snapshot?.sku || null,
            image_url: item.product_snapshot?.image_url || null,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })) || [],
        };

        await supabase.functions.invoke('dispatch-webhook', {
          body: {
            event_type: 'order.paid',
            payload: webhookPayload,
          },
        });

        console.log('✅ Webhook order.paid disparado com sucesso');
      } catch (webhookError) {
        console.error('Erro ao disparar webhook order.paid:', webhookError);
        // Não falha a requisição por erro no webhook
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        order_id: orderData.id,
        order_number: orderData.order_number,
        new_status: newStatus,
        payment_status: paymentStatus
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing N8N webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});