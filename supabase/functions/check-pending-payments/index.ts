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

interface MercadoPagoPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  date_approved: string | null;
  external_reference: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Iniciando verificação de pagamentos pendentes...');

    const mercadoPagoToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!mercadoPagoToken) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return new Response(
        JSON.stringify({ error: 'MERCADO_PAGO_ACCESS_TOKEN not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar pedidos pendentes com payment_id
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, payment_id, total_amount, created_at')
      .eq('status', 'pending')
      .eq('payment_status', 'pending')
      .not('payment_id', 'is', null)
      .order('created_at', { ascending: true })
      .limit(50);

    if (ordersError) {
      console.error('❌ Erro ao buscar pedidos:', ordersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending orders' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('✅ Nenhum pedido pendente encontrado');
      return new Response(
        JSON.stringify({ message: 'No pending orders found', checked: 0, updated: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📦 Encontrados ${pendingOrders.length} pedidos pendentes`);

    const results = {
      checked: pendingOrders.length,
      updated: 0,
      errors: 0,
      details: [] as Array<{ order_number: string; payment_id: string; mp_status: string; action: string }>
    };

    for (const order of pendingOrders) {
      try {
        console.log(`🔄 Verificando pedido ${order.order_number} - Payment ID: ${order.payment_id}`);

        // Consultar status do pagamento na API do Mercado Pago
        const mpResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${order.payment_id}`,
          {
            headers: {
              'Authorization': `Bearer ${mercadoPagoToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!mpResponse.ok) {
          console.error(`❌ Erro ao consultar MP para payment ${order.payment_id}: ${mpResponse.status}`);
          results.errors++;
          results.details.push({
            order_number: order.order_number,
            payment_id: order.payment_id,
            mp_status: 'error',
            action: `API error: ${mpResponse.status}`
          });
          continue;
        }

        const payment: MercadoPagoPayment = await mpResponse.json();
        console.log(`📊 Payment ${order.payment_id} status: ${payment.status}`);

        let newStatus = 'pending';
        let newPaymentStatus = 'pending';
        let action = 'none';

        switch (payment.status) {
          case 'approved':
            newStatus = 'pending';
            newPaymentStatus = 'paid';
            action = 'updated_to_pending_paid';
            break;
          case 'rejected':
          case 'cancelled':
            newStatus = 'cancelled';
            newPaymentStatus = 'failed';
            action = 'updated_to_cancelled';
            break;
          case 'pending':
          case 'in_process':
            action = 'still_pending';
            break;
          default:
            action = `unknown_status_${payment.status}`;
        }

        if (newStatus !== 'pending') {
          // Atualizar o pedido
          const { error: updateError } = await supabase
            .from('orders')
            .update({
              status: newStatus,
              payment_status: newPaymentStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (updateError) {
            console.error(`❌ Erro ao atualizar pedido ${order.order_number}:`, updateError);
            results.errors++;
          } else {
            console.log(`✅ Pedido ${order.order_number} atualizado para ${newStatus}`);
            results.updated++;

            // Registrar no histórico
            await supabase
              .from('order_status_history')
              .insert({
                order_id: order.id,
                status: newStatus,
                notes: `Atualizado via verificação automática - MP Status: ${payment.status}`
              });

            // Disparar webhook order.paid se aprovado
            if (payment.status === 'approved') {
              try {
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
                  .eq('id', order.id)
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

                console.log('✅ Webhook order.paid disparado');
              } catch (webhookError) {
                console.error('Erro ao disparar webhook:', webhookError);
              }
            }
          }
        }

        results.details.push({
          order_number: order.order_number,
          payment_id: order.payment_id,
          mp_status: payment.status,
          action
        });

      } catch (orderError) {
        console.error(`❌ Erro ao processar pedido ${order.order_number}:`, orderError);
        results.errors++;
      }
    }

    console.log(`📊 Verificação concluída: ${results.checked} verificados, ${results.updated} atualizados, ${results.errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Verificação concluída`,
        ...results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro geral:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
