import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // user_id
  const error = url.searchParams.get('error');

  const APP_URL = Deno.env.get('APP_URL') ?? 'https://lojafy.app';

  try {
    // 1. Validar se variáveis básicas do Supabase estão no ambiente (evitando crash no topo)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Configuração ausente no Supabase: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ML authorization error (user denied or app misconfigured)
    if (error) {
      console.error('[ml-oauth] ML returned error:', error, url.searchParams.get('error_description'));
      return Response.redirect(`${APP_URL}/reseller/integracoes?ml_error=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !state) {
      console.error('[ml-oauth] Missing code or state');
      return Response.redirect(`${APP_URL}/reseller/integracoes?ml_error=missing_params`, 302);
    }

    const userId = state;

    // 2. Tentar obter chaves do Deno.env ou como Fallback da tabela platform_settings
    let mlClientId = Deno.env.get('ML_CLIENT_ID');
    let mlClientSecret = Deno.env.get('ML_CLIENT_SECRET');

    if (!mlClientId || !mlClientSecret) {
      const { data: platSettings, error: platError } = await supabase
        .from('platform_settings')
        .select('ml_client_id, ml_client_secret')
        .maybeSingle();

      if (!platError && platSettings) {
        mlClientId = platSettings.ml_client_id || undefined;
        mlClientSecret = platSettings.ml_client_secret || undefined;
      }
    }

    if (!mlClientId || !mlClientSecret) {
      throw new Error('Configuração ausente: preencha as credenciais do Mercado Livre (ml_client_id e ml_client_secret) na tabela platform_settings do seu Supabase.');
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

    // Save integration to database
    const { error: dbError } = await supabase
      .from('mercadolivre_integrations')
      .upsert({
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
      }, { onConflict: 'user_id' });

    if (dbError) {
      console.error('[ml-oauth] DB upsert error:', dbError);
      throw new Error(`Erro ao salvar no banco de dados: ${dbError.message}`);
    }

    console.log(`✅ [ml-oauth] Integration saved for user ${userId}, ML user ${mlUserId}`);
    return Response.redirect(`${APP_URL}/reseller/ml-sucesso`, 302);

  } catch (err: any) {
    console.error('[ml-oauth] Unexpected error:', err);
    return Response.redirect(`${APP_URL}/reseller/integracoes?ml_error=${encodeURIComponent(err.message)}`, 302);
  }
});
