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

    // 2. Tentar obter chaves e APP_URL do Deno.env ou do banco de dados (tabela platform_settings)
    let mlClientId = Deno.env.get('ML_CLIENT_ID');
    let mlClientSecret = Deno.env.get('ML_CLIENT_SECRET');
    let appUrl = Deno.env.get('APP_URL');

    const platRes = await fetch(`${supabaseUrl}/rest/v1/platform_settings?select=ml_client_id,ml_client_secret,app_url`, {
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    });

    if (platRes.ok) {
      const platSettingsList = await platRes.json();
      if (platSettingsList && platSettingsList.length > 0) {
        const platSettings = platSettingsList[0];
        if (!mlClientId) mlClientId = platSettings.ml_client_id || undefined;
        if (!mlClientSecret) mlClientSecret = platSettings.ml_client_secret || undefined;
        // Se appUrl estiver vazio ou apontar incorretamente para o Supabase (contendo 'supabase'), usa o do banco
        if (!appUrl || appUrl.includes('supabase')) {
          appUrl = platSettings.app_url || undefined;
        }
      }
    } else {
      console.error('[ml-oauth] Failed to fetch platform_settings via REST API:', platRes.status);
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

    const userId = state;

    if (!mlClientId || !mlClientSecret) {
      throw new Error('Configuração ausente: preencha o ml_client_id e ml_client_secret na tabela platform_settings do seu Supabase.');
    }

    const ML_REDIRECT_URI = Deno.env.get('ML_REDIRECT_URI') ?? `${supabaseUrl}/functions/v1/ml-oauth-callback`;

    // Exchange authorization code for access token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: mlClientId,
        client_secret: mlClientSecret,
        code,
        redirect_uri: ML_REDIRECT_URI,
      }),
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

    // Save integration to database via REST API POST (upsert)
    const dbRes = await fetch(`${supabaseUrl}/rest/v1/mercadolivre_integrations`, {
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

    if (!dbRes.ok) {
      const dbErrText = await dbRes.text();
      console.error('[ml-oauth] DB REST upsert error:', dbRes.status, dbErrText);
      throw new Error(`Erro ao salvar no banco de dados (REST HTTP ${dbRes.status}): ${dbErrText}`);
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
