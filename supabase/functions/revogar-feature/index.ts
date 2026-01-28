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
        JSON.stringify({ error: 'Apenas super admins podem revogar features' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { user_id, feature_slug, motivo } = await req.json();

    if (!user_id || !feature_slug) {
      return new Response(
        JSON.stringify({ error: 'Parâmetros obrigatórios: user_id, feature_slug' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get feature by slug
    const { data: feature, error: featureError } = await supabase
      .from('features')
      .select('id, slug, nome')
      .eq('slug', feature_slug)
      .single();

    if (featureError || !feature) {
      return new Response(
        JSON.stringify({ error: 'Feature não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user_features status to revogado
    const { error: updateError } = await supabase
      .from('user_features')
      .update({ 
        status: 'revogado',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user_id)
      .eq('feature_id', feature.id);

    if (updateError) {
      console.error('Error revoking feature:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao revogar feature' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log transaction
    await supabase.from('feature_transactions').insert({
      user_id,
      feature_id: feature.id,
      tipo: 'revogacao',
      executado_por: caller.id,
      motivo: motivo || 'Revogado pelo administrador',
    });

    // Check for dependent features and revoke them too
    const { data: allFeatures } = await supabase
      .from('features')
      .select('id, slug, requer_features');

    if (allFeatures) {
      for (const f of allFeatures) {
        if (f.requer_features && f.requer_features.includes(feature_slug)) {
          // This feature depends on the revoked one, revoke it too
          await supabase
            .from('user_features')
            .update({ 
              status: 'revogado',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user_id)
            .eq('feature_id', f.id);

          // Log cascade revocation
          await supabase.from('feature_transactions').insert({
            user_id,
            feature_id: f.id,
            tipo: 'revogacao',
            executado_por: caller.id,
            motivo: `Revogação em cascata: depende de "${feature_slug}"`,
          });
        }
      }
    }

    console.log(`Feature "${feature_slug}" revoked from user ${user_id} by ${caller.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in revogar-feature:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
