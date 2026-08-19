import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { buildOrderItemsPayload } from '../_shared/build-order-items-payload.ts';
import { getPublicSignedUrl } from '../_shared/get-public-signed-url.ts';

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

    console.log('ðŸ“¤ Disparando webhook manual para pedido:', order_id);

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
      console.error('âŒ Pedido nÃ£o encontrado:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found', details: orderError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o pedido estÃ¡ pago
    if (fullOrder.payment_status !== 'paid') {
      console.log('âš ï¸ Pedido nÃ£o estÃ¡ pago:', fullOrder.payment_status);
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
      // Pedidos de visitantes - usar dados do prÃ³prio pedido
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

    // Buscar etiqueta de envio
    let shippingLabel = null;
    const { data: shippingFile } = await supabase
      .from('order_shipping_files')
      .select('file_name, file_path, file_size, uploaded_at')
      .eq('order_id', fullOrder.id)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (shippingFile?.file_path) {
      // Gerar URL assinada (válida por 7 dias)
      let { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('shipping-files')
        .createSignedUrl(shippingFile.file_path, 604800);
        
      if (signedUrlError || !signedUrlData?.signedUrl) {
        const fallback = await supabase.storage
          .from('shipping-labels')
          .createSignedUrl(shippingFile.file_path, 604800);
        signedUrlData = fallback.data;
      }
      
      shippingLabel = {
        file_name: shippingFile.file_name,
        file_size: shippingFile.file_size,
        uploaded_at: shippingFile.uploaded_at,
        download_url: getPublicSignedUrl(signedUrlData?.signedUrl) || null,
      };
      console.log('📦 Etiqueta de envio encontrada:', shippingFile.file_name);
    }

    const webhookPayload = {
      order_id: fullOrder.id,
      order_number: fullOrder.order_number,
      total_amount: fullOrder.total_amount,
      payment_method: fullOrder.payment_method || 'pix',
      customer: customerData,
      reseller: resellerData,
      items: await buildOrderItemsPayload(supabase, fullOrder.order_items || []),
      shipping_label: shippingLabel,
    };

    console.log('ðŸ“¦ Payload do webhook:', JSON.stringify(webhookPayload, null, 2));

    // Disparar o webhook
    const { data: dispatchResult, error: dispatchError } = await supabase.functions.invoke('dispatch-webhook', {
      body: {
        event_type: 'order.paid',
        ignore_deduplication: true,
        payload: webhookPayload,
      },
    });

    if (dispatchError) {
      console.error('âŒ Erro ao disparar webhook:', dispatchError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to dispatch webhook', 
          details: dispatchError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('âœ… Webhook order.paid disparado manualmente com sucesso');

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
    console.error('âŒ Erro geral:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : String(error) 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
