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

interface MercadoPagoWebhook {
  id: number;
  live_mode: boolean;
  type: string;
  date_created: string;
  application_id: number;
  user_id: number;
  version: number;
  api_version: string;
  action: string;
  data: {
    id: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Webhook Mercado Pago recebido');
    
    const webhookData: MercadoPagoWebhook = await req.json();
    console.log('Webhook data:', webhookData);

    // Validate webhook type
    if (webhookData.type !== 'payment') {
      console.log('Webhook type not supported:', webhookData.type);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const paymentId = webhookData.data.id;
    console.log('Processing payment ID:', paymentId);

    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!mercadoPagoToken) {
      console.error('Mercado Pago token not configured');
      return new Response('Configuration error', { status: 500, headers: corsHeaders });
    }

    // Get payment details from Mercado Pago API
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${mercadoPagoToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment from Mercado Pago:', paymentResponse.status);
      return new Response('Failed to fetch payment', { status: 400, headers: corsHeaders });
    }

    const paymentData = await paymentResponse.json();
    console.log('Payment data from MP:', {
      id: paymentData.id,
      status: paymentData.status,
      external_reference: paymentData.external_reference
    });

    // Find order by payment_id
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('payment_id', paymentId.toString())
      .single();

    if (orderError) {
      console.error('Order not found:', orderError);
      return new Response('Order not found', { status: 404, headers: corsHeaders });
    }

    console.log('Found order:', orderData.id);

    // Map Mercado Pago status to our system
    let newStatus = 'pending';
    let paymentStatus = 'pending';

    switch (paymentData.status) {
      case 'approved':
        newStatus = 'paid';
        paymentStatus = 'paid';
        break;
      case 'pending':
        newStatus = 'pending';
        paymentStatus = 'pending';
        break;
      case 'in_process':
        newStatus = 'pending';
        paymentStatus = 'processing';
        break;
      case 'rejected':
      case 'cancelled':
        newStatus = 'cancelled';
        paymentStatus = 'failed';
        break;
      default:
        console.log('Unknown payment status:', paymentData.status);
        newStatus = orderData.status; // Keep current status
        paymentStatus = 'pending';
    }

    console.log('Updating order status:', { newStatus, paymentStatus });

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
      return new Response('Failed to update order', { status: 500, headers: corsHeaders });
    }

    // Create status history entry
    const { error: historyError } = await supabase
      .from('order_status_history')
      .insert({
        order_id: orderData.id,
        status: newStatus,
        notes: `Payment ${paymentData.status} - Mercado Pago ID: ${paymentId}`
      });

    if (historyError) {
      console.error('Failed to create status history:', historyError);
    }

    console.log('Order updated successfully');

    // TODO: Send email notification to user if payment is approved
    if (paymentData.status === 'approved') {
      console.log('Payment approved - should send confirmation email');
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});