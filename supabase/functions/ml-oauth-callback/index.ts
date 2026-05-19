import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID') ?? '';
const ML_CLIENT_SECRET = Deno.env.get('ML_CLIENT_SECRET') ?? '';
const ML_REDIRECT_URI = Deno.env.get('ML_REDIRECT_URI') ?? `${Deno.env.get('SUPABASE_URL')}/functions/v1/ml-oauth-callback`;
const APP_URL = Deno.env.get('APP_URL') ?? 'https://lojafy.app';

serve(async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // user_id
  const error = url.searchParams.get('error');

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

  try {
    // Exchange authorization code for access token
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        code,
        redirect_uri: ML_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[ml-oauth] Token exchange failed:', tokenRes.status, errBody);
      return Response.redirect(`${APP_URL}/reseller/integracoes?ml_error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, token_type, scope } = tokenData;

    // Get ML user info
    const meRes = await fetch('https://api.mercadolibre.com/users/me', {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!meRes.ok) {
      console.error('[ml-oauth] Failed to get user info:', meRes.status);
      return Response.redirect(`${APP_URL}/reseller/integracoes?ml_error=user_info_failed`, 302);
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
      return Response.redirect(`${APP_URL}/reseller/integracoes?ml_error=db_error`, 302);
    }

    console.log(`✅ [ml-oauth] Integration saved for user ${userId}, ML user ${mlUserId}`);
    return Response.redirect(`${APP_URL}/reseller/ml-sucesso`, 302);

  } catch (err) {
    console.error('[ml-oauth] Unexpected error:', err);
    return Response.redirect(`${APP_URL}/reseller/integracoes?ml_error=unexpected`, 302);
  }
});
