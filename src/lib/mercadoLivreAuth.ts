export function mercadoLivreAuthUrl(userId: string, clientId: string) {
  const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
  const redirectUri = `${supabaseUrl}/functions/v1/ml-oauth-callback`;
  const state = `${userId}:${redirectUri}`;
  return `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
}
