import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth header and verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if caller is super_admin
    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', caller.id)
      .single();

    if (callerProfile?.role !== 'super_admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas super admins podem atribuir features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, feature_slug, tipo_periodo, motivo } = await req.json();

    if (!user_id || !feature_slug || !tipo_periodo) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: user_id, feature_slug, tipo_periodo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile with subscription_expires_at
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('user_id, subscription_expires_at')
      .eq('user_id', user_id)
      .single();

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get feature by slug
    const { data: feature, error: featureError } = await supabase
      .from('features')
      .select('*')
      .eq('slug', feature_slug)
      .single();

    if (featureError || !feature) {
      return new Response(
        JSON.stringify({ error: 'Feature não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check dependencies
    if (feature.requer_features && feature.requer_features.length > 0) {
      for (const requiredSlug of feature.requer_features) {
        const { data: hasRequired } = await supabase.rpc('user_has_feature', {
          _user_id: user_id,
          _feature_slug: requiredSlug,
        });

        if (!hasRequired) {
          return new Response(
            JSON.stringify({ 
              error: `Feature requer "${requiredSlug}" que o usuário não possui` 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Determine expiration: vitalicio/cortesia = null, others use profile subscription
    const isLifetime = tipo_periodo === 'vitalicio' || tipo_periodo === 'cortesia';
    const data_expiracao = isLifetime ? null : userProfile.subscription_expires_at;

    // Calculate days remaining
    let dias_restantes: number | null = null;
    if (data_expiracao) {
      const expirationDate = new Date(data_expiracao);
      const now = new Date();
      dias_restantes = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Upsert user_features
    const { data: userFeature, error: upsertError } = await supabase
      .from('user_features')
      .upsert({
        user_id,
        feature_id: feature.id,
        status: tipo_periodo === 'trial' ? 'trial' : 'ativo',
        tipo_periodo,
        data_inicio: new Date().toISOString(),
        data_expiracao, // Now uses profile expiration or null for lifetime
        trial_usado: tipo_periodo === 'trial',
        origem: 'admin',
        atribuido_por: caller.id,
        motivo,
      }, {
        onConflict: 'user_id,feature_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting user_feature:', upsertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atribuir feature' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log transaction
    await supabase.from('feature_transactions').insert({
      user_id,
      feature_id: feature.id,
      tipo: 'atribuicao',
      tipo_periodo,
      executado_por: caller.id,
      motivo,
      metadata: { 
        usa_expiracao_perfil: !isLifetime,
        expiracao_perfil: data_expiracao 
      },
    });

    console.log(`Feature "${feature_slug}" assigned to user ${user_id} by ${caller.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        userFeature,
        expiracao_info: {
          usa_expiracao_perfil: !isLifetime,
          expiracao_perfil: data_expiracao,
          dias_restantes,
          nota: isLifetime 
            ? 'Esta feature nunca expira' 
            : 'Feature expira junto com a assinatura do perfil'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in atribuir-feature:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
