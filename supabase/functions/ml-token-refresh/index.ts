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

const ML_CLIENT_ID = Deno.env.get('ML_CLIENT_ID') ?? '';
const ML_CLIENT_SECRET = Deno.env.get('ML_CLIENT_SECRET') ?? '';

// Returns a valid (refreshed if needed) access_token for the given user_id.
// Can also be imported as a shared utility by other edge functions.
export async function getValidToken(userId: string): Promise<{ access_token: string; ml_user_id: number }> {
  const { data: integration, error } = await supabase
    .from('mercadolivre_integrations')
    .select('access_token, refresh_token, expires_at, ml_user_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !integration) {
    throw new Error('ML integration not found or inactive');
  }

  // Check if token expires within 10 minutes
  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 10 * 60 * 1000;

  if (!needsRefresh) {
    return { access_token: integration.access_token, ml_user_id: integration.ml_user_id };
  }

  if (!integration.refresh_token) {
    throw new Error('Token expired and no refresh_token available');
  }

  // Refresh the token
  const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ML_CLIENT_ID,
      client_secret: ML_CLIENT_SECRET,
      refresh_token: integration.refresh_token,
    }),
  });

  if (!refreshRes.ok) {
    const body = await refreshRes.text();
    throw new Error(`Token refresh failed: ${refreshRes.status} ${body}`);
  }

  const newToken = await refreshRes.json();
  const newExpiresAt = new Date(Date.now() + (newToken.expires_in ?? 21600) * 1000).toISOString();

  await supabase
    .from('mercadolivre_integrations')
    .update({
      access_token: newToken.access_token,
      refresh_token: newToken.refresh_token ?? integration.refresh_token,
      expires_in: newToken.expires_in ?? null,
      expires_at: newExpiresAt,
      last_refreshed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  console.log(`[ml-token-refresh] Token refreshed for user ${userId}`);
  return { access_token: newToken.access_token, ml_user_id: integration.ml_user_id };
}

// HTTP endpoint — can be called directly for manual refresh
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await getValidToken(user_id);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
