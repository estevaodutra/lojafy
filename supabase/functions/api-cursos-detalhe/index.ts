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
      .eq('key', apiKey)
      .eq('active', true)
      .single();

    if (keyError || !keyData) {
      console.error('API key inválida:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'API key inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const course_id = url.searchParams.get('course_id');

    if (!course_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'course_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar curso
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', course_id)
      .single();

    if (courseError || !courseData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Curso não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Estatísticas de matrículas
    const { count: totalEnrollments } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course_id);

    const { count: completedEnrollments } = await supabase
      .from('course_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course_id)
      .eq('progress_percentage', 100);

    // Calcular alunos ativos (sem expiração ou não expirados)
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('expires_at')
      .eq('course_id', course_id);

    const now = new Date();
    const activeStudents = enrollments?.filter(e => 
      !e.expires_at || new Date(e.expires_at) > now
    ).length || 0;

    // Calcular progresso médio
    const { data: progressData } = await supabase
      .from('course_enrollments')
      .select('progress_percentage')
      .eq('course_id', course_id);

    const averageProgress = progressData && progressData.length > 0
      ? progressData.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / progressData.length
      : 0;

    const completionRate = totalEnrollments && totalEnrollments > 0
      ? (completedEnrollments! / totalEnrollments) * 100
      : 0;

    console.log('Curso encontrado:', course_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...courseData,
          statistics: {
            total_enrollments: totalEnrollments || 0,
            active_students: activeStudents,
            completion_rate: Math.round(completionRate * 10) / 10,
            average_progress: Math.round(averageProgress * 10) / 10
          }
        }
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
