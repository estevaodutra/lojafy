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
    const { user_id, course_id, expires_at, all_courses } = body;

    // Validações
    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se não for all_courses, course_id é obrigatório
    if (!all_courses && !course_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'course_id é obrigatório (ou use all_courses: true)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se o usuário existe
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('user_id', user_id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se all_courses === true, matricular em todos os cursos publicados
    if (all_courses === true) {
      // Buscar todos os cursos publicados
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_published', true);

      if (coursesError) {
        console.error('Erro ao buscar cursos:', coursesError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao buscar cursos' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!courses || courses.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nenhum curso publicado encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar matrículas existentes
      const { data: existingEnrollments } = await supabase
        .from('course_enrollments')
        .select('course_id')
        .eq('user_id', user_id);

      const existingCourseIds = new Set((existingEnrollments || []).map(e => e.course_id));

      // Filtrar cursos que ainda não tem matrícula
      const coursesToEnroll = courses.filter(c => !existingCourseIds.has(c.id));

      if (coursesToEnroll.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Usuário já está matriculado em todos os cursos publicados' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar matrículas em lote
      const enrollments = coursesToEnroll.map(course => ({
        user_id,
        course_id: course.id,
        expires_at: expires_at || null,
        progress_percentage: 0
      }));

      const { data: insertedData, error: enrollError } = await supabase
        .from('course_enrollments')
        .insert(enrollments)
        .select();

      if (enrollError) {
        console.error('Erro ao criar matrículas:', enrollError);
        return new Response(
          JSON.stringify({ success: false, error: enrollError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Usuário ${user_id} matriculado em ${coursesToEnroll.length} cursos`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `Matrícula realizada em ${coursesToEnroll.length} cursos`,
          data: {
            total_enrolled: coursesToEnroll.length,
            enrolled_courses: coursesToEnroll.map(c => ({
              course_id: c.id,
              title: c.title
            })),
            skipped_existing: existingCourseIds.size
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fluxo normal: matrícula em curso específico
    // Verificar se o curso existe
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

    // Verificar se já existe matrícula
    const { data: existingEnrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .single();

    if (existingEnrollment) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário já matriculado neste curso' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar matrícula
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        user_id,
        course_id,
        expires_at: expires_at || null,
        progress_percentage: 0
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar matrícula:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Matrícula criada com sucesso:', data.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Matrícula realizada com sucesso',
        data
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
