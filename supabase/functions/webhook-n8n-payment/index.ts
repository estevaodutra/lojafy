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
    const { data: orderData, error: orderError } = await supabase
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

    if (!orderData) {
      console.error('Order not found for payment ID:', paymentId);
      return new Response(
        JSON.stringify({ error: `Order not found for payment ID: ${paymentId}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found order:', orderData.id, 'Current status:', orderData.status);

    // Map N8N status to our system status
    let newStatus = orderData.status; // Keep current status as default
    let paymentStatus = orderData.payment_status; // Keep current payment status as default

    switch (webhookData.status.toLowerCase()) {
      case 'approved':
        newStatus = 'paid';
        paymentStatus = 'paid';
        console.log('Payment approved - updating to paid status');
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
    const historyNotes = `Payment ${webhookData.status} via N8N - Payment ID: ${paymentId}`;
    if (webhookData.amount) {
      historyNotes.concat(` - Amount: ${webhookData.amount}`);
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
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});