import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

async function logApiRequest(supabase: any, data: any) {
  try {
    await supabase.from('api_request_logs').insert(data);
  } catch (e) { console.error('[LOG_ERROR]', e); }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);
  let statusCode = 200;
  let errorMessage: string | null = null;
  let apiKeyId: string | null = null;

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      statusCode = 401;
      errorMessage = 'API key required';
      return new Response(
        JSON.stringify({ error: 'API key required in X-API-Key header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key and get permissions
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, user_id, permissions, active')
      .eq('api_key', apiKey)
      .eq('active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      statusCode = 401;
      errorMessage = 'Invalid or inactive API key';
      return new Response(
        JSON.stringify({ error: 'Invalid or inactive API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    apiKeyId = apiKeyData.id;

    // Check permissions
    const permissions = apiKeyData.permissions as any;
    if (!permissions?.produtos?.read) {
      statusCode = 403;
      errorMessage = 'Insufficient permissions';
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
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const search = url.searchParams.get('search');
    const category_id = url.searchParams.get('category_id');
    const active = url.searchParams.get('active');
    const domain_id = url.searchParams.get('domain_id');
    const condition = url.searchParams.get('condition');
    const has_variations = url.searchParams.get('has_variations');

    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        original_price,
        stock_quantity,
        sku,
        gtin_ean13,
        brand,
        active,
        high_rotation,
        created_at,
        updated_at,
        attributes,
        variations,
        domain_id,
        condition,
        has_variations,
        enriched_at,
        catalog_source,
        catalog_source_id,
        categories:category_id(id, name, slug)
      `);

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
    }
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    if (active !== null && active !== undefined) {
      query = query.eq('active', active === 'true');
    }
    if (domain_id) {
      query = query.eq('domain_id', domain_id);
    }
    if (condition) {
      query = query.eq('condition', condition);
    }
    if (has_variations !== null && has_variations !== undefined) {
      query = query.eq('has_variations', has_variations === 'true');
    }

    // Apply pagination and ordering
    query = query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    const { data: products, error: productsError } = await query;

    if (productsError) {
      console.error('Error fetching products:', productsError);
      statusCode = 500;
      errorMessage = productsError.message;
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar produtos',
          details: productsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get total count for pagination
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true });

    const totalPages = Math.ceil((count || 0) / limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: products?.map(product => ({
          id: product.id,
          nome: product.name,
          descricao: product.description,
          preco: product.price,
          preco_original: product.original_price,
          estoque: product.stock_quantity,
          sku: product.sku,
          gtin: product.gtin_ean13,
          marca: product.brand,
          ativo: product.active,
          alta_rotatividade: product.high_rotation,
          categoria: product.categories,
          atributos: product.attributes,
          variacoes: product.variations,
          dominio_id: product.domain_id,
          condicao: product.condition,
          tem_variacoes: product.has_variations,
          enriquecido_em: product.enriched_at,
          fonte_catalogo: product.catalog_source,
          fonte_catalogo_id: product.catalog_source_id,
          criado_em: product.created_at,
          atualizado_em: product.updated_at
        })) || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-produtos-listar:', error);
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    // Log request asynchronously
    logApiRequest(supabase, {
      function_name: 'api-produtos-listar',
      method: req.method,
      path: url.pathname,
      api_key_id: apiKeyId,
      query_params: Object.fromEntries(url.searchParams),
      status_code: statusCode,
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
    });
  }
});
