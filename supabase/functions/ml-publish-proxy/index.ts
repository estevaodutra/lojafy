const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WEBHOOK_URL = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const responseText = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    return new Response(responseText, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': contentType },
    });
  } catch (error) {
    console.error('[ml-publish-proxy] Error:', error);
    const message = error.name === 'AbortError' ? 'Webhook timeout' : error.message;
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
