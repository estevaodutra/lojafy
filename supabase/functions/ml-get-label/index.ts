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
    // Autenticar o usuário
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id');
    const format = url.searchParams.get('format') ?? 'pdf2'; // pdf2 ou zpl2

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'order_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar o pedido — o usuário deve ser o reseller_id ou super_admin
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, reseller_id, ml_shipment_id, ml_label_url, order_number')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar permissão: próprio revendedor ou super_admin
    const isSuperAdmin = profile?.role === 'super_admin';
    if (!isSuperAdmin && order.reseller_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!order.ml_shipment_id) {
      return new Response(JSON.stringify({ error: 'No shipment found for this order' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar access_token do revendedor
    const resellerUserId = order.reseller_id;
    const { data: integration } = await supabase
      .from('mercadolivre_integrations')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', resellerUserId)
      .eq('is_active', true)
      .single();

    if (!integration) {
      return new Response(JSON.stringify({ error: 'ML integration not found for reseller' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh token se necessário
    let accessToken = integration.access_token;
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
      const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
        body: { user_id: resellerUserId },
      });
      if (refreshData?.access_token) accessToken = refreshData.access_token;
    }

    // Baixar etiqueta do ML
    const labelRes = await fetch(
      `https://api.mercadolibre.com/shipments/${order.ml_shipment_id}/labels?response_type=${format}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );

    if (!labelRes.ok) {
      const err = await labelRes.text();
      console.error('[ml-get-label] ML error:', labelRes.status, err);
      return new Response(JSON.stringify({ error: 'Failed to fetch label from ML', details: err }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = labelRes.headers.get('Content-Type') ?? 'application/pdf';
    const labelBytes = await labelRes.arrayBuffer();
    const filename = `etiqueta-${order.order_number}.${format === 'zpl2' ? 'zpl' : 'pdf'}`;

    console.log(`[ml-get-label] ✅ Label downloaded for order ${order.order_number}`);

    return new Response(labelBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(labelBytes.byteLength),
      },
    });

  } catch (err) {
    console.error('[ml-get-label] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
