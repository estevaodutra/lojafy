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

    const body = await req.json();
    const {
      enrollment_id,
      lesson_id,
      watch_time_seconds,
      last_position_seconds,
      is_completed,
      notes
    } = body;

    // Validações
    if (!enrollment_id || !lesson_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'enrollment_id e lesson_id são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a matrícula existe
    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('user_id')
      .eq('id', enrollment_id)
      .single();

    if (enrollmentError || !enrollmentData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Matrícula não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a aula existe
    const { data: lessonData, error: lessonError } = await supabase
      .from('course_lessons')
      .select('id')
      .eq('id', lesson_id)
      .single();

    if (lessonError || !lessonData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aula não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se já existe progresso para esta aula
    const { data: existingProgress } = await supabase
      .from('lesson_progress')
      .select('id')
      .eq('enrollment_id', enrollment_id)
      .eq('lesson_id', lesson_id)
      .single();

    let data, error;

    if (existingProgress) {
      // Atualizar progresso existente
      const updateData: any = {};
      
      if (watch_time_seconds !== undefined) updateData.watch_time_seconds = watch_time_seconds;
      if (last_position_seconds !== undefined) updateData.last_position_seconds = last_position_seconds;
      if (is_completed !== undefined) {
        updateData.is_completed = is_completed;
        if (is_completed) updateData.completed_at = new Date().toISOString();
      }
      if (notes !== undefined) updateData.notes = notes;

      ({ data, error } = await supabase
        .from('lesson_progress')
        .update(updateData)
        .eq('id', existingProgress.id)
        .select()
        .single());
    } else {
      // Criar novo progresso
      ({ data, error } = await supabase
        .from('lesson_progress')
        .insert({
          user_id: enrollmentData.user_id,
          enrollment_id,
          lesson_id,
          watch_time_seconds: watch_time_seconds || 0,
          last_position_seconds: last_position_seconds || 0,
          is_completed: is_completed || false,
          completed_at: is_completed ? new Date().toISOString() : null,
          notes: notes || null
        })
        .select()
        .single());
    }

    if (error) {
      console.error('Erro ao atualizar progresso:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Progresso atualizado com sucesso:', data.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Progresso atualizado com sucesso',
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
