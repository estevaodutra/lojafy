import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Método não permitido' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API Key
    const apiKey = req.headers.get('X-API-Key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key não fornecida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('active', true)
      .maybeSingle();

    if (keyError || !keyData) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key inválida ou inativa' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    const permissions = keyData.permissions as Record<string, any> || {};
    if (!permissions.features?.write) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão features.write não concedida' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    // Parse request body
    const { user_id, feature_slug, tipo_periodo, motivo } = await req.json();

    if (!user_id || !feature_slug || !tipo_periodo) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Parâmetros obrigatórios: user_id, feature_slug, tipo_periodo' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate tipo_periodo
    const tiposValidos = ['trial', 'mensal', 'anual', 'vitalicio', 'cortesia'];
    if (!tiposValidos.includes(tipo_periodo)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `tipo_periodo inválido. Valores aceitos: ${tiposValidos.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists and get subscription_expires_at
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('user_id, subscription_expires_at')
      .eq('user_id', user_id)
      .maybeSingle();

    if (userError || !userProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get feature by slug
    const { data: feature, error: featureError } = await supabase
      .from('features')
      .select('*')
      .eq('slug', feature_slug)
      .maybeSingle();

    if (featureError || !feature) {
      return new Response(
        JSON.stringify({ success: false, error: 'Feature não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!feature.ativo) {
      return new Response(
        JSON.stringify({ success: false, error: 'Feature está inativa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
              success: false, 
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
        origem: 'api',
        atribuido_por: keyData.user_id,
        motivo,
      }, {
        onConflict: 'user_id,feature_id',
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting user_feature:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atribuir feature' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log transaction
    await supabase.from('feature_transactions').insert({
      user_id,
      feature_id: feature.id,
      tipo: 'atribuicao',
      tipo_periodo,
      executado_por: keyData.user_id,
      motivo: motivo || `Atribuído via API - ${keyData.key_name}`,
      metadata: { 
        usa_expiracao_perfil: !isLifetime,
        expiracao_perfil: data_expiracao,
        api_key_name: keyData.key_name 
      },
    });

    console.log(`Feature "${feature_slug}" assigned to user ${user_id} via API key ${keyData.key_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feature atribuída com sucesso',
        data: {
          user_id,
          feature_slug,
          status: userFeature.status,
          tipo_periodo,
          data_inicio: userFeature.data_inicio,
          usa_expiracao_perfil: !isLifetime,
          expiracao_perfil: data_expiracao,
          dias_restantes
        },
        expiracao_info: {
          fonte: isLifetime ? 'tipo_periodo (vitalício/cortesia)' : 'profiles.subscription_expires_at',
          nota: isLifetime 
            ? 'Esta feature nunca expira' 
            : 'Feature expira junto com a assinatura do perfil'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-features-atribuir:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
