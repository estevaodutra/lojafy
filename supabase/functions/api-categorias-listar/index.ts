import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required in X-API-Key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate API key and get permissions
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('user_id, permissions, active')
      .eq('api_key', apiKey)
      .eq('active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permissions
    const permissions = apiKeyData.permissions as any;
    if (!permissions?.categorias?.read) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for this endpoint' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('api_key', apiKey);

    // Parse query parameters
    const url = new URL(req.url);
    const active = url.searchParams.get('active');

    // Build query
    let query = supabase
      .from('categories')
      .select(`
        id,
        name,
        slug,
        icon,
        color,
        image_url,
        product_count,
        active,
        created_at,
        updated_at
      `)
      .order('name');

    // Apply filters
    if (active !== null && active !== undefined) {
      query = query.eq('active', active === 'true');
    }

    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar categorias',
          details: categoriesError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: categories?.map(category => ({
          id: category.id,
          nome: category.name,
          slug: category.slug,
          icone: category.icon,
          cor: category.color,
          imagem_url: category.image_url,
          total_produtos: category.product_count,
          ativo: category.active,
          criado_em: category.created_at,
          atualizado_em: category.updated_at
        })) || []
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-categorias-listar:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});