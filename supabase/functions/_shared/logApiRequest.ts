import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export interface ApiLogData {
  function_name: string;
  method: string;
  path?: string;
  api_key_id?: string;
  user_id?: string;
  ip_address?: string;
  query_params?: Record<string, unknown>;
  request_body?: Record<string, unknown>;
  status_code: number;
  response_summary?: Record<string, unknown>;
  error_message?: string;
  duration_ms: number;
}

export async function logApiRequest(data: ApiLogData): Promise<void> {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabase.from('api_request_logs').insert({
      function_name: data.function_name,
      method: data.method,
      path: data.path,
      api_key_id: data.api_key_id || null,
      user_id: data.user_id || null,
      ip_address: data.ip_address,
      query_params: data.query_params || null,
      request_body: data.request_body || null,
      status_code: data.status_code,
      response_summary: data.response_summary || null,
      error_message: data.error_message || null,
      duration_ms: data.duration_ms,
    });
  } catch (error) {
    console.error('[LOG_ERROR] Failed to log API request:', error);
  }
}

export function getClientIp(req: Request): string | undefined {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         req.headers.get('x-real-ip') ||
         undefined;
}
