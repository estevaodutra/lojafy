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
    // Validate shared secret
    const webhookSecret = Deno.env.get('N8N_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret');
      if (!providedSecret || providedSecret !== webhookSecret) {
        console.error('Invalid or missing webhook secret');
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
      // Check if this is a wallet recharge
      if (webhookData.external_reference && webhookData.external_reference.startsWith('wallet_')) {
        const txId = webhookData.external_reference.replace('wallet_', '');
        console.log('Detected wallet recharge, transaction ID:', txId);

        if (webhookData.status.toLowerCase() === 'approved') {
          // Get the pending transaction
          const { data: walletTx, error: txError } = await supabase
            .from('wallet_transactions')
            .select('*, wallets!inner(user_id)')
            .eq('id', txId)
            .eq('status', 'pending')
            .single();

          if (txError || !walletTx) {
            console.log('Wallet transaction not found or already processed:', txId);
            return new Response(
              JSON.stringify({ success: true, message: 'Wallet transaction already processed or not found' }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Credit wallet via RPC
          const userId = (walletTx as any).wallets?.user_id;
          const { data: creditResult, error: creditError } = await supabase.rpc('creditar_carteira', {
            p_user_id: userId,
            p_valor: walletTx.valor,
            p_taxa: walletTx.taxa || 0,
            p_descricao: 'Recarga via PIX',
            p_referencia_tipo: 'recarga_pix',
            p_referencia_id: txId,
            p_tipo: 'recarga',
          });

          if (creditError) {
            console.error('Error crediting wallet:', creditError);
          } else {
            console.log('✅ Wallet credited successfully:', creditResult);
          }

          // Update original pending transaction status
          await supabase
            .from('wallet_transactions')
            .update({ status: 'completed', payment_id: paymentId })
            .eq('id', txId);

          // Notify user
          if (userId) {
            await supabase.from('notifications').insert({
              user_id: userId,
              title: '💰 Saldo adicionado!',
              message: `R$ ${Number(walletTx.valor).toFixed(2)} foi creditado na sua carteira.`,
              type: 'wallet_recharge',
              action_url: '/minha-conta/carteira',
              action_label: 'Ver Carteira',
            });
          }

          return new Response(
            JSON.stringify({ success: true, message: 'Wallet recharged', transaction_id: txId }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Wallet recharge status: ' + webhookData.status }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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

    // Map N8N status to payment_status (English) and optionally order status (Portuguese)
    let newStatus = orderData.status; // Keep current order status as default
    let paymentStatus = orderData.payment_status; // Keep current payment status as default

    switch (webhookData.status.toLowerCase()) {
      case 'approved':
        newStatus = 'recebido'; // Order status in Portuguese
        paymentStatus = 'paid';
        console.log('Payment approved - order status → recebido, payment_status → paid');
        break;
      case 'pending':
      case 'in_process':
        // Only update payment_status, don't change order status
        paymentStatus = 'pending';
        console.log('Payment still pending - payment_status → pending');
        break;
      case 'rejected':
      case 'cancelled':
        // Only update payment_status, don't change order status
        paymentStatus = 'failed';
        console.log('Payment rejected/cancelled - payment_status → failed');
        break;
      default:
        console.log('Unknown payment status:', webhookData.status, '- keeping current status');
    }

    console.log('Updating order:', { 
      orderId: orderData.id,
      from: { status: orderData.status, payment_status: orderData.payment_status },
      to: { status: newStatus, payment_status: paymentStatus }
    });

    // Update order - atomic update to prevent race conditions
    const updateData: Record<string, string> = {
      payment_status: paymentStatus,
      updated_at: new Date().toISOString()
    };
    
    // Only update order status if it changed (approved → recebido)
    if (newStatus !== orderData.status) {
      updateData.status = newStatus;
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderData.id)
      .neq('payment_status', 'paid')
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('Failed to update order:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update order status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no row was updated, another process already marked it as paid
    if (!updatedOrder) {
      console.log('⚠️ Order already updated by another process, skipping webhook dispatch');
      return new Response(
        JSON.stringify({ success: true, message: 'Already processed by another request' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

        // Buscar etiqueta de envio
        let shippingLabel = null;
        const { data: shippingFile } = await supabase
          .from('order_shipping_files')
          .select('file_name, file_path, file_size, uploaded_at')
          .eq('order_id', fullOrder?.id)
          .limit(1)
          .maybeSingle();

        if (shippingFile?.file_path) {
          const { data: signedUrlData } = await supabase.storage
            .from('shipping-files')
            .createSignedUrl(shippingFile.file_path, 604800);
          
          shippingLabel = {
            file_name: shippingFile.file_name,
            file_size: shippingFile.file_size,
            uploaded_at: shippingFile.uploaded_at,
            download_url: signedUrlData?.signedUrl || null,
          };
          console.log('📦 Etiqueta de envio encontrada:', shippingFile.file_name);
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
          shipping_label: shippingLabel,
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});