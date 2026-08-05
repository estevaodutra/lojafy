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

    const mlPath = path || (query ? `/sites/MLB/search?q=${encodeURIComponent(query)}&limit=15` : '/sites/MLB/search?q=produto&limit=15');
    const isPublicRoute = mlPath.includes('/sites/') || mlPath.includes('/description') || mlPath.includes('/items/') || mlPath.includes('/categories/');

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    // Para rotas privadas do catálogo (/products/), tentar token de app se disponível
    if (!isPublicRoute) {
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
          if (tokenData.access_token) {
            headers['Authorization'] = `Bearer ${tokenData.access_token}`;
          }
        }
      } catch (tokenErr) {
        console.warn('[ml-public-search] OAuth token failed, proceeding without token:', tokenErr);
      }
    }

    const mlUrl = `https://api.mercadolibre.com${mlPath}`;
    console.log(`[ml-public-search] Fetching ML: ${mlUrl}`);
    
    let mlRes = await fetch(mlUrl, { headers });

    // Se falhar e a rota era de catálogo (/products), tentar fallback para /sites/MLB/search
    if (!mlRes.ok && mlPath.includes('/products/search')) {
      const fallbackQuery = query || 'produto';
      const fallbackUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(fallbackQuery)}&limit=15`;
      console.log(`[ml-public-search] Fallback para rota pública: ${fallbackUrl}`);
      mlRes = await fetch(fallbackUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        }
      });
    }

    const data = await mlRes.json().catch(() => ({}));

    if (!mlRes.ok) {
      console.error('[ml-public-search] ML request failed:', mlRes.status, data);
      return new Response(JSON.stringify({ error: 'ML request failed', details: data, results: [] }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ml-public-search] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error', results: [] }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
