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
      .select('id, title')
      .eq('id', course_id)
      .single();

    if (courseError || !courseData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Curso não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar módulos com aulas
    const { data: modules, error: modulesError } = await supabase
      .from('course_modules')
      .select(`
        id,
        title,
        description,
        position,
        is_published
      `)
      .eq('course_id', course_id)
      .order('position', { ascending: true });

    if (modulesError) {
      console.error('Erro ao buscar módulos:', modulesError);
      return new Response(
        JSON.stringify({ success: false, error: modulesError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar aulas de cada módulo
    const modulesWithLessons = await Promise.all(
      (modules || []).map(async (module) => {
        const { data: lessons } = await supabase
          .from('course_lessons')
          .select('id, title, description, duration_minutes, position, video_url, is_published')
          .eq('module_id', module.id)
          .order('position', { ascending: true });

        return {
          ...module,
          lessons: lessons || []
        };
      })
    );

    // Calcular estatísticas
    const totalModules = modulesWithLessons.length;
    const totalLessons = modulesWithLessons.reduce((sum, m) => sum + m.lessons.length, 0);
    const totalDurationMinutes = modulesWithLessons.reduce(
      (sum, m) => sum + m.lessons.reduce((lsum, l) => lsum + (l.duration_minutes || 0), 0),
      0
    );
    const totalDurationHours = Math.round((totalDurationMinutes / 60) * 10) / 10;

    console.log('Conteúdo do curso carregado:', course_id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          course_id: courseData.id,
          course_title: courseData.title,
          modules: modulesWithLessons,
          summary: {
            total_modules: totalModules,
            total_lessons: totalLessons,
            total_duration_hours: totalDurationHours
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
