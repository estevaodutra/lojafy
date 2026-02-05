import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePremiumResellerRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  validity_months: number; // 0 = vitalício
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: CreatePremiumResellerRequest = await req.json();
    const { email, password, first_name, last_name, phone, validity_months } = body;

    console.log(`[create-premium-reseller] Criando usuário premium: ${email}`);

    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        phone,
      },
    });

    if (authError) {
      console.error('[create-premium-reseller] Erro ao criar usuário:', authError);
      
      if (authError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ error: 'Este email já está cadastrado.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log(`[create-premium-reseller] Usuário criado: ${userId}`);

    // 2. Calcular data de expiração
    let subscriptionExpiresAt: string | null = null;
    if (validity_months > 0) {
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + validity_months);
      subscriptionExpiresAt = expirationDate.toISOString();
    }

    // 3. Atualizar profile com role=reseller, plan=premium
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        role: 'reseller',
        subscription_plan: 'premium',
        subscription_expires_at: subscriptionExpiresAt,
        first_name,
        last_name,
        phone,
        is_active: true,
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('[create-premium-reseller] Erro ao atualizar profile:', profileError);
    }

    // Também atualizar user_roles para manter consistência
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({
        user_id: userId,
        role: 'reseller',
      }, { onConflict: 'user_id' });

    if (roleError) {
      console.error('[create-premium-reseller] Erro ao atualizar user_roles:', roleError);
    }

    // 4. Buscar todas as features ativas e atribuir ao usuário
    const { data: features, error: featuresError } = await supabase
      .from('features')
      .select('id, slug')
      .eq('ativo', true);

    if (featuresError) {
      console.error('[create-premium-reseller] Erro ao buscar features:', featuresError);
    } else if (features && features.length > 0) {
      console.log(`[create-premium-reseller] Atribuindo ${features.length} features`);
      
      const userFeatures = features.map(f => ({
        user_id: userId,
        feature_id: f.id,
        status: 'ativo',
        tipo_periodo: validity_months === 0 ? 'vitalicio' : 'mensal',
        data_inicio: new Date().toISOString(),
        data_expiracao: subscriptionExpiresAt,
        motivo: 'Cadastro via link premium',
      }));

      const { error: insertFeaturesError } = await supabase
        .from('user_features')
        .insert(userFeatures);

      if (insertFeaturesError) {
        console.error('[create-premium-reseller] Erro ao inserir features:', insertFeaturesError);
      }
    }

    // 5. Buscar todos os cursos publicados e matricular
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select('id')
      .eq('is_published', true);

    if (coursesError) {
      console.error('[create-premium-reseller] Erro ao buscar cursos:', coursesError);
    } else if (courses && courses.length > 0) {
      console.log(`[create-premium-reseller] Matriculando em ${courses.length} cursos`);
      
      const enrollments = courses.map(c => ({
        user_id: userId,
        course_id: c.id,
        expires_at: subscriptionExpiresAt,
      }));

      const { error: insertEnrollmentsError } = await supabase
        .from('course_enrollments')
        .insert(enrollments);

      if (insertEnrollmentsError) {
        console.error('[create-premium-reseller] Erro ao inserir matrículas:', insertEnrollmentsError);
      }
    }

    console.log(`[create-premium-reseller] Setup completo para ${email}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        email,
        role: 'reseller',
        plan: 'premium',
        expires_at: subscriptionExpiresAt,
        features_count: features?.length || 0,
        courses_count: courses?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[create-premium-reseller] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
