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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado. Faça login novamente.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão expirada. Faça login novamente.' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    let orderId: string | null = null;
    let format = 'pdf';

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        orderId = body.order_id || body.orderId;
        format = body.format || 'pdf';
      } catch {
        // body vazio
      }
    }

    if (!orderId) {
      const url = new URL(req.url);
      orderId = url.searchParams.get('order_id');
      format = url.searchParams.get('format') ?? 'pdf';
    }

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'ID do pedido obrigatório.' }), {
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
      return new Response(JSON.stringify({ error: 'Pedido não encontrado.' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar permissão
    const isSuperAdmin = profile?.role === 'super_admin';
    if (!isSuperAdmin && order.reseller_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Acesso negado a este pedido.' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Se já tiver URL pública salva ou arquivo no storage, tentar servir direto
    const filePath = `labels/${order.reseller_id}/${order.id}/etiqueta-${order.order_number}.pdf`;
    const { data: storageFile } = await supabase.storage.from('shipping-labels').download(filePath);
    if (storageFile) {
      const labelBytes = await storageFile.arrayBuffer();
      return new Response(labelBytes, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="etiqueta-${order.order_number}.pdf"`,
          'Content-Length': String(labelBytes.byteLength),
        },
      });
    }

    if (!order.ml_shipment_id) {
      return new Response(JSON.stringify({ error: 'Nenhuma remessa ou etiqueta vinculada a este pedido.' }), {
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
      return new Response(JSON.stringify({ error: 'Integração com Mercado Livre não encontrada para este revendedor.' }), {
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

    // Baixar etiqueta da API oficial do Mercado Livre: /shipment_labels?shipment_ids={id}&response_type=pdf
    const mlFormat = format === 'zpl2' ? 'zpl2' : 'pdf';
    const labelUrl = `https://api.mercadolibre.com/shipment_labels?shipment_ids=${order.ml_shipment_id}&response_type=${mlFormat}`;
    const labelRes = await fetch(labelUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!labelRes.ok) {
      const errText = await labelRes.text();
      console.error('[ml-get-label] ML error:', labelRes.status, errText);

      let userMsg = 'Não foi possível baixar a etiqueta no Mercado Livre.';
      if (errText.includes('status is delivered')) {
        userMsg = 'Esta remessa já foi entregue ao destinatário no Mercado Livre, por isso a etiqueta não pode mais ser impressa.';
      } else if (errText.includes('NOT_PRINTABLE_STATUS')) {
        userMsg = 'O Mercado Livre informou que esta remessa não está em status disponível para impressão.';
      }

      return new Response(JSON.stringify({ error: userMsg, details: errText }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = labelRes.headers.get('Content-Type') ?? 'application/pdf';
    const labelBytes = await labelRes.arrayBuffer();
    const filename = `etiqueta-${order.order_number}.${mlFormat === 'zpl2' ? 'zpl' : 'pdf'}`;

    // Cache no Supabase Storage em background
    try {
      await supabase.storage.from('shipping-labels').upload(filePath, labelBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });
    } catch {
      // cache non-blocking
    }

    console.log(`[ml-get-label] ✅ Etiqueta baixada com sucesso para pedido #${order.order_number}`);

    return new Response(labelBytes, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(labelBytes.byteLength),
      },
    });

  } catch (err: any) {
    console.error('[ml-get-label] Error:', err);
    return new Response(JSON.stringify({ error: err.message || 'Erro interno ao processar etiqueta.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
