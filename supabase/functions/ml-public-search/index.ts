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

    // 1. Buscar qualquer integração ativa do Mercado Livre no banco
    const { data: integration, error: dbError } = await supabase
      .from('mercadolivre_integrations')
      .select('user_id, access_token, expires_at')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (dbError) {
      console.error('[ml-public-search] Database lookup error:', dbError);
      return new Response(JSON.stringify({ error: 'Erro ao buscar integração no banco de dados' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!integration) {
      console.warn('[ml-public-search] No active Mercado Livre integrations found in DB');
      return new Response(JSON.stringify({ 
        error: 'Nenhuma integração ativa com o Mercado Livre encontrada. Por favor, vá em "Integrações" e conecte uma conta do Mercado Livre para habilitar a busca de referências.' 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Verificar se precisa de refresh no token
    let accessToken = integration.access_token;
    const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
    
    if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
      try {
        console.log(`[ml-public-search] Token expiring. Refreshing for user: ${integration.user_id}`);
        const { data: refreshData, error: refreshErr } = await supabase.functions.invoke('ml-token-refresh', {
          body: { user_id: integration.user_id },
        });
        if (refreshErr) throw refreshErr;
        if (refreshData?.access_token) {
          accessToken = refreshData.access_token;
        }
      } catch (err) {
        console.error('[ml-public-search] Token refresh failed, trying to use current token:', err);
      }
    }

    // 3. Fazer a chamada de busca no Mercado Livre usando o token de usuário real
    const mlPath = path || `/sites/MLB/search?q=${encodeURIComponent(query)}&limit=8`;
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
      return new Response(JSON.stringify({ error: 'Falha na requisição ao Mercado Livre', details: data }), {
        status: mlRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ml-public-search] Error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno no servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
