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

const ML_BASE = 'https://api.mercadolibre.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Autenticar e verificar super_admin
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
    .from('profiles').select('role').eq('user_id', user.id).single();

  // Proxy genérico: super_admin pode operar como qualquer revendedor
  // Revendedor pode operar apenas como ele mesmo
  const isSuperAdmin = profile?.role === 'super_admin';
  const isReseller = profile?.role === 'reseller';

  if (!isSuperAdmin && !isReseller) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = req.method !== 'GET' ? await req.json() : null;
    const { reseller_user_id, ml_path, method = 'GET', payload } = body ?? {};

    // reseller_user_id: qual revendedor operar como
    // ml_path: endpoint ML sem base (ex: '/users/me', '/items/MLB123')
    // method: GET, POST, PUT, DELETE
    // payload: corpo da requisição (para POST/PUT)

    if (!ml_path) {
      return new Response(JSON.stringify({ error: 'ml_path required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determinar qual user_id usar para buscar o token
    let targetUserId = isReseller ? user.id : reseller_user_id;
    if (!targetUserId) {
      return new Response(JSON.stringify({ error: 'reseller_user_id required for super_admin' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar token
    const { data: integration } = await supabase
      .from('mercadolivre_integrations')
      .select('access_token, expires_at, ml_user_id')
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .single();

    if (!integration) {
      return new Response(JSON.stringify({ error: 'ML integration not found for this reseller' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Refresh se necessário
    let accessToken = integration.access_token;
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
      const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
        body: { user_id: targetUserId },
      });
      if (refreshData?.access_token) accessToken = refreshData.access_token;
    }

    // Fazer chamada para ML API
    const mlUrl = `${ML_BASE}${ml_path}`;
    const mlRes = await fetch(mlUrl, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });

    const mlData = await mlRes.json().catch(() => ({}));

    console.log(`[ml-proxy] ${method} ${ml_path} → ${mlRes.status} (user: ${targetUserId})`);

    return new Response(JSON.stringify({
      status: mlRes.status,
      data: mlData,
      ml_user_id: integration.ml_user_id,
    }), {
      status: mlRes.ok ? 200 : mlRes.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ml-proxy] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
