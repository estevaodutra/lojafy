import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // user_id
  const error = url.searchParams.get('error');

  // Fallbacks temporários caso o banco ou Deno falhem
  let finalAppUrl = 'https://lojafy.app'; 

  try {
    // 1. Validar se variáveis básicas do Supabase estão no ambiente (evitando crash no topo)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração ausente no Supabase: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.');
    }

    // 2. Determinar a URL da API REST (usar rede interna do Docker 'http://supabase-kong:8000' para evitar NAT Loopback)
    const restUrl = 'http://supabase-kong:8000';

    // 3. Tentar obter chaves e APP_URL do Deno.env ou da tabela platform_settings via API REST interna
    let mlClientId = Deno.env.get('ML_CLIENT_ID');
    let mlClientSecret = Deno.env.get('ML_CLIENT_SECRET');
    let appUrl = Deno.env.get('APP_URL');

    // Tenta buscar no banco pela rede local do Docker
    let platSettings: any = null;
    try {
      const platRes = await fetch(`${restUrl}/rest/v1/marketplace_credentials?marketplace=eq.mercadolivre&select=client_id,client_secret,app_url`, {
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        }
      });

      if (platRes.ok) {
        const platSettingsList = await platRes.json();
        if (platSettingsList && platSettingsList.length > 0) {
          platSettings = platSettingsList[0];
        }
      } else {
        console.error('[ml-oauth] Failed to fetch marketplace_credentials via REST local API:', platRes.status);
      }
    } catch (dbFetchErr) {
      console.error('[ml-oauth] Local database REST request failed, trying external URL:', dbFetchErr);
      // Fallback para URL externa caso a rede local do Docker mude
      try {
        const platResExt = await fetch(`${supabaseUrl}/rest/v1/marketplace_credentials?marketplace=eq.mercadolivre&select=client_id,client_secret,app_url`, {
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`
          }
        });
        if (platResExt.ok) {
          const platSettingsList = await platResExt.json();
          if (platSettingsList && platSettingsList.length > 0) {
            platSettings = platSettingsList[0];
          }
        }
      } catch (extFetchErr) {
        console.error('[ml-oauth] External database REST request also failed:', extFetchErr);
      }
    }

    // Aplicar configurações obtidas do banco (prioridade máxima)
    if (platSettings) {
      mlClientId = platSettings.client_id || mlClientId || undefined;
      mlClientSecret = platSettings.client_secret || mlClientSecret || undefined;
      // Se appUrl estiver configurado no banco, priorizar. Se não, usar o do env.
      if (platSettings.app_url) {
        appUrl = platSettings.app_url;
      } else if (!appUrl || appUrl.includes('supabase')) {
        appUrl = undefined;
      }
    }

    if (appUrl) {
      finalAppUrl = appUrl;
    }

    // ML authorization error (user denied or app misconfigured)
    if (error) {
      console.error('[ml-oauth] ML returned error:', error, url.searchParams.get('error_description'));
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${finalAppUrl}/reseller/integracoes?ml_error=${encodeURIComponent(error)}` }
      });
    }

    if (!code || !state) {
      console.error('[ml-oauth] Missing code or state');
      return new Response(null, {
        status: 302,
        headers: { 'Location': `${finalAppUrl}/reseller/integracoes?ml_error=missing_params` }
      });
    }

    // O state contém o formato "userId:redirectUri"
    const stateParts = (state || '').split(':');
    const userId = stateParts[0];
    const stateRedirectUri = stateParts.slice(1).join(':');

    if (!mlClientId || !mlClientSecret) {
      throw new Error('Configuração ausente: preencha o client_id e client_secret na tabela marketplace_credentials do seu Supabase.');
    }

    // Define o redirect_uri dinamicamente com base no state, x-forwarded headers ou URL da própria requisição
    const requestUrl = new URL(req.url);
    const proto = req.headers.get('x-forwarded-proto') || requestUrl.protocol.replace(':', '');
    const host = req.headers.get('x-forwarded-host') || requestUrl.host;
    
    let ML_REDIRECT_URI = stateRedirectUri || Deno.env.get('ML_REDIRECT_URI');
    if (!ML_REDIRECT_URI) {
      if (host.includes('supabase-kong') || host.includes('localhost') || host.includes('127.0.0.1')) {
        ML_REDIRECT_URI = `https://lojafy-supabase.d2x.site/functions/v1/ml-oauth-callback`;
      } else {
        ML_REDIRECT_URI = `${proto}://${host}${requestUrl.pathname}`;
      }
    }

    console.log('[ml-oauth] Exchange attempt:', {
      userId,
      stateRedirectUri,
      resolvedRedirectUri: ML_REDIRECT_URI,
      clientId: mlClientId
    });

    // Exchange authorization code for access token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: mlClientId,
        client_secret: mlClientSecret,
        code: code,
        redirect_uri: ML_REDIRECT_URI,
      }).toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[ml-oauth] Token exchange failed:', tokenRes.status, errBody);
      throw new Error(`Troca de token falhou (ML HTTP ${tokenRes.status}): ${errBody}`);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, token_type, scope } = tokenData;

    // Get ML user info
    const meRes = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!meRes.ok) {
      console.error('[ml-oauth] Failed to get user info:', meRes.status);
      throw new Error(`Falha ao obter dados do usuário no Mercado Livre (ML HTTP ${meRes.status})`);
    }

    const mlUser = await meRes.json();
    const mlUserId = mlUser.id;

    const expiresAt = new Date(Date.now() + (expires_in ?? 21600) * 1000).toISOString();

    // Save integration to database via REST API POST (upsert) - tentamos primeiro na rede interna local
    let dbSuccess = false;
    let dbErrText = '';
    
    try {
      const dbRes = await fetch(`${restUrl}/rest/v1/mercadolivre_integrations`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          user_id: userId,
          access_token,
          refresh_token: refresh_token ?? null,
          token_type: token_type ?? 'Bearer',
          expires_in: expires_in ?? null,
          expires_at: expiresAt,
          scope: scope ?? null,
          ml_user_id: mlUserId,
          is_active: true,
          last_refreshed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      });

      if (dbRes.ok) {
        dbSuccess = true;
      } else {
        dbErrText = await dbRes.text();
        console.error('[ml-oauth] Local DB upsert failed, trying external:', dbRes.status, dbErrText);
      }
    } catch (localDbErr: any) {
      console.error('[ml-oauth] Local DB request threw error, trying external:', localDbErr);
      dbErrText = localDbErr.message;
    }

    // Fallback para URL externa caso o local falhe
    if (!dbSuccess) {
      const dbResExt = await fetch(`${supabaseUrl}/rest/v1/mercadolivre_integrations`, {
        method: 'POST',
        headers: {
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          user_id: userId,
          access_token,
          refresh_token: refresh_token ?? null,
          token_type: token_type ?? 'Bearer',
          expires_in: expires_in ?? null,
          expires_at: expiresAt,
          scope: scope ?? null,
          ml_user_id: mlUserId,
          is_active: true,
          last_refreshed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
      });

      if (dbResExt.ok) {
        dbSuccess = true;
      } else {
        const extDbErrText = await dbResExt.text();
        console.error('[ml-oauth] External DB upsert failed:', dbResExt.status, extDbErrText);
        throw new Error(`Erro ao salvar no banco de dados (REST HTTP ${dbResExt.status}): ${extDbErrText}`);
      }
    }

    console.log(`✅ [ml-oauth] Integration saved for user ${userId}, ML user ${mlUserId}`);
    return new Response(null, {
      status: 302,
      headers: { 'Location': `${finalAppUrl}/reseller/ml-sucesso` }
    });

  } catch (err: any) {
    console.error('[ml-oauth] Unexpected error:', err);
    return new Response(null, {
      status: 302,
      headers: { 'Location': `${finalAppUrl}/reseller/integracoes?ml_error=${encodeURIComponent(err.message)}` }
    });
  }
});
