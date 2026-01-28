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

    // Calculate expiration date
    let data_expiracao: string | null = null;
    const now = new Date();

    switch (tipo_periodo) {
      case 'mensal':
        data_expiracao = new Date(now.setDate(now.getDate() + 30)).toISOString();
        break;
      case 'anual':
        data_expiracao = new Date(now.setDate(now.getDate() + 365)).toISOString();
        break;
      case 'trial':
        data_expiracao = new Date(now.setDate(now.getDate() + (feature.trial_dias || 7))).toISOString();
        break;
      case 'vitalicio':
      case 'cortesia':
        data_expiracao = null;
        break;
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
        data_expiracao,
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
      metadata: { data_expiracao },
    });

    console.log(`Feature "${feature_slug}" assigned to user ${user_id} by ${caller.id}`);

    return new Response(
      JSON.stringify({ success: true, userFeature }),
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
