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

    const body = await req.json();
    const { enrollment_id } = body;

    if (!enrollment_id) {
      statusCode = 400;
      errorMessage = 'enrollment_id é obrigatório';
      return new Response(
        JSON.stringify({ success: false, error: 'enrollment_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se matrícula existe
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('id', enrollment_id)
      .single();

    if (enrollmentError || !enrollmentData) {
      statusCode = 404;
      errorMessage = 'Matrícula não encontrada';
      return new Response(
        JSON.stringify({ success: false, error: 'Matrícula não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deletar progresso associado
    const { error: progressError } = await supabase
      .from('lesson_progress')
      .delete()
      .eq('enrollment_id', enrollment_id);

    if (progressError) {
      console.error('Erro ao deletar progresso:', progressError);
    }

    // Deletar matrícula
    const { error } = await supabase
      .from('course_enrollments')
      .delete()
      .eq('id', enrollment_id);

    if (error) {
      console.error('Erro ao cancelar matrícula:', error);
      statusCode = 400;
      errorMessage = error.message;
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Matrícula cancelada com sucesso:', enrollment_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Matrícula cancelada com sucesso'
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
      function_name: 'api-matriculas-cancelar',
      method: req.method,
      path: url.pathname,
      api_key_id: apiKeyId,
      status_code: statusCode,
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
    });
  }
});
