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
    const { user_id, feature_id, feature_slug, all_features, tipo_periodo, motivo } = await req.json();

    // Validate user_id is required
    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If not all_features, need feature_id or feature_slug
    if (!all_features && !feature_id && !feature_slug) {
      return new Response(
        JSON.stringify({ success: false, error: 'feature_id é obrigatório (ou use all_features: true)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // tipo_periodo is optional - default to 'mensal'
    const tipoPeriodoFinal = tipo_periodo || 'mensal';

    // Validate tipo_periodo if provided
    const tiposValidos = ['trial', 'mensal', 'anual', 'vitalicio', 'cortesia'];
    if (!tiposValidos.includes(tipoPeriodoFinal)) {
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

    // Determine expiration: vitalicio/cortesia = null, others use profile subscription
    const isLifetime = tipoPeriodoFinal === 'vitalicio' || tipoPeriodoFinal === 'cortesia';
    const data_expiracao = isLifetime ? null : userProfile.subscription_expires_at;

    // Calculate days remaining
    let dias_restantes: number | null = null;
    if (data_expiracao) {
      const expirationDate = new Date(data_expiracao);
      const now = new Date();
      dias_restantes = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    // Handle all_features mode
    if (all_features === true) {
      console.log(`Processing all_features for user ${user_id}`);

      // 1. Fetch all active features
      const { data: allFeatures, error: featuresError } = await supabase
        .from('features')
        .select('*')
        .eq('ativo', true)
        .order('ordem_exibicao');

      if (featuresError || !allFeatures || allFeatures.length === 0) {
        return new Response(
          JSON.stringify({ success: false, error: 'Nenhuma feature ativa encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // 2. Fetch features user already has (active)
      const { data: existingFeatures } = await supabase
        .from('user_features')
        .select('feature_id')
        .eq('user_id', user_id)
        .in('status', ['ativo', 'trial']);

      const existingIds = new Set(existingFeatures?.map(f => f.feature_id) || []);

      // Build a map of slug -> feature for dependency checking
      const featuresBySlug = new Map(allFeatures.map(f => [f.slug, f]));

      // 3. Process each feature
      const assignedFeatures: Array<{ id: string; slug: string; nome: string }> = [];
      const skippedExisting: Array<{ id: string; slug: string; nome: string }> = [];
      const skippedDependencies: Array<{ slug: string; nome: string; requer: string[] }> = [];

      for (const feat of allFeatures) {
        // Already has this feature?
        if (existingIds.has(feat.id)) {
          skippedExisting.push({ id: feat.id, slug: feat.slug, nome: feat.nome });
          continue;
        }

        // Check dependencies
        if (feat.requer_features && feat.requer_features.length > 0) {
          let hasDeps = true;
          for (const reqSlug of feat.requer_features) {
            // Check if user has the required feature or if it's being assigned in this batch
            const requiredFeature = featuresBySlug.get(reqSlug);
            const hasViaExisting = requiredFeature && existingIds.has(requiredFeature.id);
            
            if (!hasViaExisting) {
              const { data: hasReq } = await supabase.rpc('user_has_feature', {
                _user_id: user_id,
                _feature_slug: reqSlug,
              });
              if (!hasReq) {
                hasDeps = false;
                break;
              }
            }
          }
          if (!hasDeps) {
            skippedDependencies.push({ 
              slug: feat.slug, 
              nome: feat.nome, 
              requer: feat.requer_features 
            });
            continue;
          }
        }

        // Assign feature
        const { error: upsertError } = await supabase
          .from('user_features')
          .upsert({
            user_id,
            feature_id: feat.id,
            status: tipoPeriodoFinal === 'trial' ? 'trial' : 'ativo',
            tipo_periodo: tipoPeriodoFinal,
            data_inicio: new Date().toISOString(),
            data_expiracao,
            trial_usado: tipoPeriodoFinal === 'trial',
            origem: 'api',
            atribuido_por: keyData.user_id,
            motivo,
          }, {
            onConflict: 'user_id,feature_id',
          });

        if (!upsertError) {
          assignedFeatures.push({ id: feat.id, slug: feat.slug, nome: feat.nome });
          
          // Log transaction
          await supabase.from('feature_transactions').insert({
            user_id,
            feature_id: feat.id,
            tipo: 'atribuicao',
            tipo_periodo: tipoPeriodoFinal,
            executado_por: keyData.user_id,
            motivo: motivo || `Atribuído via API (lote) - ${keyData.key_name}`,
            metadata: { 
              usa_expiracao_perfil: !isLifetime,
              expiracao_perfil: data_expiracao,
              api_key_name: keyData.key_name,
              batch_mode: true
            },
          });
        }
      }

      console.log(`Batch assignment complete: ${assignedFeatures.length} assigned, ${skippedExisting.length} existing, ${skippedDependencies.length} skipped due to dependencies`);

      return new Response(
        JSON.stringify({
          success: true,
          message: `${assignedFeatures.length} feature(s) atribuída(s) com sucesso`,
          data: {
            total_assigned: assignedFeatures.length,
            assigned_features: assignedFeatures,
            skipped_existing: skippedExisting.length,
            skipped_dependencies: skippedDependencies
          },
          expiracao_info: {
            fonte: isLifetime ? 'tipo_periodo (vitalício/cortesia)' : 'profiles.subscription_expires_at',
            expires_at: data_expiracao,
            dias_restantes,
            nota: isLifetime 
              ? 'Estas features nunca expiram' 
              : 'Features expiram junto com a assinatura do perfil'
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Single feature assignment mode
    // Get feature by ID (priority) or slug
    let feature;
    if (feature_id) {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('id', feature_id)
        .maybeSingle();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Feature não encontrada pelo ID' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      feature = data;
    } else if (feature_slug) {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('slug', feature_slug)
        .maybeSingle();
      
      if (error || !data) {
        return new Response(
          JSON.stringify({ success: false, error: 'Feature não encontrada pelo slug' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      feature = data;
    }

    if (!feature!.ativo) {
      return new Response(
        JSON.stringify({ success: false, error: 'Feature está inativa' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check dependencies
    if (feature!.requer_features && feature!.requer_features.length > 0) {
      for (const requiredSlug of feature!.requer_features) {
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

    // Upsert user_features
    const { data: userFeature, error: upsertError } = await supabase
      .from('user_features')
      .upsert({
        user_id,
        feature_id: feature!.id,
        status: tipoPeriodoFinal === 'trial' ? 'trial' : 'ativo',
        tipo_periodo: tipoPeriodoFinal,
        data_inicio: new Date().toISOString(),
        data_expiracao,
        trial_usado: tipoPeriodoFinal === 'trial',
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
      feature_id: feature!.id,
      tipo: 'atribuicao',
      tipo_periodo: tipoPeriodoFinal,
      executado_por: keyData.user_id,
      motivo: motivo || `Atribuído via API - ${keyData.key_name}`,
      metadata: { 
        usa_expiracao_perfil: !isLifetime,
        expiracao_perfil: data_expiracao,
        api_key_name: keyData.key_name 
      },
    });

    console.log(`Feature "${feature!.slug}" assigned to user ${user_id} via API key ${keyData.key_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Feature atribuída com sucesso',
        data: {
          user_id,
          feature_id: feature!.id,
          feature_slug: feature!.slug,
          status: userFeature.status,
          tipo_periodo: tipoPeriodoFinal,
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
