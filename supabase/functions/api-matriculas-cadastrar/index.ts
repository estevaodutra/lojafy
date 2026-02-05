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
    const { user_id, course_id, all_courses } = body;
    // Note: expires_at parameter is intentionally ignored - expiration is controlled by profile

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

    // Verificar se o usuário existe e obter subscription_expires_at
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('user_id, subscription_expires_at')
      .eq('user_id', user_id)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // A expiração da matrícula herda do perfil do usuário
    const expires_at = userData.subscription_expires_at;

    // Calculate days remaining
    let dias_restantes: number | null = null;
    if (expires_at) {
      const expirationDate = new Date(expires_at);
      const now = new Date();
      dias_restantes = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
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
        // Retornar sucesso - usuário já tem acesso completo
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Usuário já está matriculado em todos os cursos publicados',
            data: {
              total_enrolled: 0,
              enrolled_courses: [],
              skipped_existing: existingCourseIds.size,
              already_enrolled_all: true
            },
            expiracao_info: {
              fonte: 'profiles.subscription_expires_at',
              expires_at,
              dias_restantes,
              nota: 'Matrículas expiram junto com a assinatura do perfil'
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar matrículas em lote - expiration from profile
      const enrollments = coursesToEnroll.map(course => ({
        user_id,
        course_id: course.id,
        expires_at, // Inherited from profile.subscription_expires_at
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
          },
          expiracao_info: {
            fonte: 'profiles.subscription_expires_at',
            expires_at,
            dias_restantes,
            nota: 'Matrículas expiram junto com a assinatura do perfil'
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

    // Criar matrícula - expiration from profile
    const { data, error } = await supabase
      .from('course_enrollments')
      .insert({
        user_id,
        course_id,
        expires_at, // Inherited from profile.subscription_expires_at
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
        data,
        expiracao_info: {
          fonte: 'profiles.subscription_expires_at',
          expires_at,
          dias_restantes,
          nota: 'Matrícula expira junto com a assinatura do perfil'
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
