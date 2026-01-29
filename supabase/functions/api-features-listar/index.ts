import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
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
    if (!permissions.features?.read) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão features.read não concedida' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    // Parse query parameters
    const url = new URL(req.url);
    const active = url.searchParams.get('active');
    const categoria = url.searchParams.get('categoria');

    // Build query
    let query = supabase
      .from('features')
      .select('*')
      .order('categoria', { ascending: true })
      .order('ordem_exibicao', { ascending: true });

    if (active !== null) {
      query = query.eq('ativo', active === 'true');
    }

    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    const { data: features, error: featuresError } = await query;

    if (featuresError) {
      console.error('Error fetching features:', featuresError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar features' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user counts for each feature
    const featuresWithCounts = await Promise.all(
      (features || []).map(async (feature) => {
        const { data: countData } = await supabase.rpc('get_feature_user_count', {
          _feature_id: feature.id
        });

        return {
          ...feature,
          usuarios_ativos: countData || 0
        };
      })
    );

    // Calculate summary
    const porCategoria: Record<string, number> = {};
    featuresWithCounts.forEach(f => {
      porCategoria[f.categoria] = (porCategoria[f.categoria] || 0) + 1;
    });

    console.log(`Listed ${featuresWithCounts.length} features via API key ${keyData.key_name}`);

    return new Response(
      JSON.stringify({
        success: true,
        data: featuresWithCounts,
        summary: {
          total: featuresWithCounts.length,
          por_categoria: porCategoria
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-features-listar:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
