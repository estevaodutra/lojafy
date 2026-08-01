import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID') || '2003351424267574';
const ML_CLIENT_SECRET = Deno.env.get('ML_CLIENT_SECRET') || 'xxhhZC2YUeAi2GWMM222aPstgCfu0GTL';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { query, path } = body;

    // 1. Gerar token de aplicação (client_credentials)
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
      }),
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

    // 2. Fazer a requisição no Mercado Livre com o Token de Aplicação
    const mlPath = path || `/products/search?status=active&site_id=MLB&q=${encodeURIComponent(query)}&limit=15`;
    const mlUrl = `https://api.mercadolibre.com${mlPath}`;
    
    const mlRes = await fetch(mlUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      }
    });

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
