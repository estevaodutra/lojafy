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

    // Parse query params
    const url = new URL(req.url);
    const userId = url.searchParams.get('user_id');
    const enrollmentId = url.searchParams.get('enrollment_id');

    if (!userId && !enrollmentId) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id ou enrollment_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build query
    let query = supabase
      .from('lesson_progress')
      .select(`
        *,
        lesson:course_lessons(
          id,
          title,
          duration_minutes,
          module_id,
          module:course_modules(
            id,
            title,
            course_id,
            course:courses(
              id,
              title
            )
          )
        )
      `);

    if (enrollmentId) {
      query = query.eq('enrollment_id', enrollmentId);
    } else if (userId) {
      query = query.eq('user_id', userId);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar progresso:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular estatísticas
    const totalLessons = data?.length || 0;
    const completedLessons = data?.filter(p => p.is_completed).length || 0;
    const totalWatchTime = data?.reduce((sum, p) => sum + (p.watch_time_seconds || 0), 0) || 0;

    console.log(`Progresso consultado: ${totalLessons} aulas, ${completedLessons} completas`);

    return new Response(
      JSON.stringify({
        success: true,
        data,
        summary: {
          total_lessons: totalLessons,
          completed_lessons: completedLessons,
          completion_percentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
          total_watch_time_seconds: totalWatchTime,
          total_watch_time_hours: Math.round(totalWatchTime / 3600 * 100) / 100
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
