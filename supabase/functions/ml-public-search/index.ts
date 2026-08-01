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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { query, path } = body;

    // Load credentials from database first, falling back to environment variables or defaults
    let mlClientId = Deno.env.get('ML_CLIENT_ID') || '2003351424267574';
    let mlClientSecret = Deno.env.get('ML_CLIENT_SECRET') || 'xxhhZC2YUeAi2GWMM222aPstgCfu0GTL';

    try {
      const { data: platSettings } = await supabase
        .from('marketplace_credentials')
        .select('client_id, client_secret')
        .eq('marketplace', 'mercadolivre')
        .maybeSingle();

      if (platSettings) {
        if (platSettings.client_id) mlClientId = platSettings.client_id;
        if (platSettings.client_secret) mlClientSecret = platSettings.client_secret;
      }
    } catch (platErr) {
      console.warn('[ml-public-search] Failed to fetch custom credentials from marketplace_credentials:', platErr);
    }

    // 1. Gerar token de aplicação (client_credentials)
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: mlClientId,
        client_secret: mlClientSecret,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('[ml-public-search] Failed to get app token:', errText);
      return new Response(JSON.stringify({ error: 'Auth failed with ML' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Fazer a requisição no Mercado Livre
    const mlPath = path || `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(query)}&limit=15`;
    const mlUrl = `https://api.mercadolibre.com${mlPath}`;
    
    // Rotas de listagem comum (/sites/) e descrição de anúncios (/description) bloqueiam tokens de servidor/Client Credentials,
    // mas aceitam requisições sem qualquer autenticação (públicas). Enviamos token apenas para catálogo (/products).
    const isPublicRoute = mlPath.includes('/sites/') || mlPath.includes('/description');
    
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };
    
    if (!isPublicRoute) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    console.log(`[ml-public-search] Fetching ML: ${mlUrl} (authenticated: ${!isPublicRoute})`);
    
    const mlRes = await fetch(mlUrl, { headers });

    const data = await mlRes.json().catch(() => ({}));

    if (!mlRes.ok) {
      console.error('[ml-public-search] ML request failed:', mlRes.status, data);
      return new Response(JSON.stringify({ error: 'ML request failed', details: data }), {
        status: mlRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ml-public-search] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
