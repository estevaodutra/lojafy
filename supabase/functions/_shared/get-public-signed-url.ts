/**
 * Converts an internal Supabase Storage signed URL (e.g. referencing http://kong:8000)
 * to a public-facing URL using the configured public Supabase URL.
 * (Trigger deploy with custom port)
 */
export function getPublicSignedUrl(signedUrl: string | null | undefined): string | null {
  if (!signedUrl) return null;

  // PUBLIC_SUPABASE_URL should be configured in the production environment.
  // Fallback to the known production domain 'https://lojafy-supabase.d2x.site' if not set.
  const publicSupabaseUrl = Deno.env.get('PUBLIC_SUPABASE_URL') || 'https://lojafy-supabase.d2x.site';

  try {
    const urlObj = new URL(signedUrl);
    // Replace internal hostnames with the public Supabase URL
    if (
      urlObj.hostname === 'kong' ||
      urlObj.hostname === 'localhost' ||
      urlObj.hostname === '127.0.0.1' ||
      urlObj.hostname.startsWith('172.') || // internal Docker networks
      urlObj.hostname.startsWith('10.') ||
      urlObj.hostname.startsWith('192.168.')
    ) {
      const pathAndQuery = urlObj.pathname + urlObj.search;
      const sanitizedPublicUrl = publicSupabaseUrl.replace(/\/$/, '');
      const sanitizedPath = pathAndQuery.startsWith('/') ? pathAndQuery : '/' + pathAndQuery;
      return sanitizedPublicUrl + sanitizedPath;
    }
    return signedUrl;
  } catch (e) {
    console.error('[getPublicSignedUrl] Error parsing URL:', e);
    return signedUrl;
  }
}
