import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('X-API-Key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key é obrigatória' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar API Key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (keyError || !keyData) {
      console.error('API key inválida:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'API key inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { enrollment_id } = body;

    if (!enrollment_id) {
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
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
