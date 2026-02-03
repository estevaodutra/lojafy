import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

async function logApiRequest(supabase: any, data: any) {
  try {
    await supabase.from('api_request_logs').insert(data);
  } catch (e) { console.error('[LOG_ERROR]', e); }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);
  let statusCode = 200;
  let errorMessage: string | null = null;
  let apiKeyId: string | null = null;

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const apiKey = req.headers.get('X-API-Key');
    
    if (!apiKey) {
      statusCode = 401;
      errorMessage = 'API key é obrigatória';
      return new Response(
        JSON.stringify({ success: false, error: 'API key é obrigatória' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar API Key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (keyError || !keyData) {
      console.error('API key inválida:', keyError);
      statusCode = 401;
      errorMessage = 'API key inválida';
      return new Response(
        JSON.stringify({ success: false, error: 'API key inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    apiKeyId = keyData.id;

    const user_id = url.searchParams.get('user_id');
    const course_id = url.searchParams.get('course_id');

    if (!user_id || !course_id) {
      statusCode = 400;
      errorMessage = 'user_id e course_id são obrigatórios';
      return new Response(
        JSON.stringify({ success: false, error: 'user_id e course_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar matrícula
    const { data, error } = await supabase
      .from('course_enrollments')
      .select('*')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ success: true, enrolled: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
    const isExpired = expiresAt ? expiresAt < now : false;
    const isCompleted = data.progress_percentage === 100 && !!data.completed_at;

    let status = 'active';
    if (isExpired) status = 'expired';
    else if (isCompleted) status = 'completed';

    console.log('Matrícula encontrada:', data.id);

    return new Response(
      JSON.stringify({
        success: true,
        enrolled: true,
        data: {
          enrollment_id: data.id,
          enrolled_at: data.enrolled_at,
          expires_at: data.expires_at,
          status: status,
          progress_percentage: data.progress_percentage,
          is_expired: isExpired,
          is_completed: isCompleted,
          completed_at: data.completed_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro inesperado:', error);
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    logApiRequest(supabase, {
      function_name: 'api-matriculas-verificar',
      method: req.method,
      path: url.pathname,
      api_key_id: apiKeyId,
      query_params: Object.fromEntries(url.searchParams),
      status_code: statusCode,
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
    });
  }
});
