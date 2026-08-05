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

    let mlPath = path || (query ? `/sites/MLB/search?q=${encodeURIComponent(query)}&limit=15` : '/sites/MLB/search?q=produto&limit=15');
    
    // Obter credenciais do Mercado Livre
    let mlClientId = Deno.env.get('ML_CLIENT_ID') || '2003351424267574';
    let mlClientSecret = Deno.env.get('ML_CLIENT_SECRET') || 'xxhhZC2YUeAi2GWMM222aPstgCfu0GTL';

    try {
      const { data: platSettings } = await supabase
        .from('marketplace_credentials')
        .select('client_id, client_secret')
        .eq('marketplace', 'mercadolivre')
        .maybeSingle();

      if (platSettings?.client_id) mlClientId = platSettings.client_id;
      if (platSettings?.client_secret) mlClientSecret = platSettings.client_secret;
    } catch (platErr) {
      console.warn('[ml-public-search] Erro ao buscar credenciais:', platErr);
    }

    let accessToken = '';
    try {
      const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: mlClientId,
          client_secret: mlClientSecret,
        }).toString(),
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        accessToken = tokenData.access_token || '';
      }
    } catch (tokenErr) {
      console.warn('[ml-public-search] OAuth token failed:', tokenErr);
    }

    const baseHeaders: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    const authHeaders = { ...baseHeaders };
    if (accessToken) {
      authHeaders['Authorization'] = `Bearer ${accessToken}`;
    }

    // 1ª Tentativa: Com Token de App (evita bloqueio de Datacenter Cloud IPs)
    const mlUrl = `https://api.mercadolibre.com${mlPath}`;
    console.log(`[ml-public-search] Tentando busca autenticada: ${mlUrl}`);
    let mlRes = await fetch(mlUrl, { headers: authHeaders });

    let data = await mlRes.json().catch(() => ({}));

    // 2ª Tentativa (Fallback 1): Sem Token (Público) se a 1ª falhou ou não trouxe resultados
    if (!mlRes.ok || data.error || (Array.isArray(data.results) && data.results.length === 0)) {
      console.log(`[ml-public-search] Tentando busca pública sem token: ${mlUrl}`);
      const fallbackRes = await fetch(mlUrl, { headers: baseHeaders });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json().catch(() => ({}));
        if (fallbackData && (fallbackData.results?.length > 0 || fallbackData.id)) {
          mlRes = fallbackRes;
          data = fallbackData;
        }
      }
    }

    // 3ª Tentativa (Fallback 2): Alternar entre /sites/MLB/search e /products/search
    if (!mlRes.ok || data.error || (Array.isArray(data.results) && data.results.length === 0)) {
      let altPath = '';
      if (mlPath.includes('/sites/MLB/search')) {
        const qParam = new URLSearchParams(mlPath.split('?')[1] || '').get('q') || query || 'produto';
        altPath = `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(qParam)}&limit=15`;
      } else if (mlPath.includes('/products/search')) {
        const qParam = new URLSearchParams(mlPath.split('?')[1] || '').get('q') || query || 'produto';
        altPath = `/sites/MLB/search?q=${encodeURIComponent(qParam)}&limit=15`;
      }

      if (altPath) {
        console.log(`[ml-public-search] Tentando rota alternativa: https://api.mercadolibre.com${altPath}`);
        const altRes = await fetch(`https://api.mercadolibre.com${altPath}`, { headers: authHeaders });
        if (altRes.ok) {
          const altData = await altRes.json().catch(() => ({}));
          if (altData && (altData.results?.length > 0 || altData.id)) {
            mlRes = altRes;
            data = altData;
          }
        }
      }
    }

    return new Response(JSON.stringify(data || { results: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ml-public-search] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', results: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
