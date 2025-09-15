import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${new Date().toISOString()}] Starting api-categorias-listar request`);
    
    // Health check endpoint
    const url = new URL(req.url);
    if (url.searchParams.get('health') === '1') {
      console.log('[HEALTH] Health check requested');
      return new Response(
        JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[ENV] SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('[ENV] SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? 'Present' : 'Missing');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[ENV] Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error', 
          code: 'ENV_MISSING',
          details: 'Required environment variables not configured'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify API key
    const apiKey = req.headers.get('x-api-key');
    console.log('[AUTH] API key:', apiKey ? 'Present' : 'Missing');
    
    if (!apiKey) {
      console.log('[AUTH] No API key provided');
      return new Response(
        JSON.stringify({ 
          error: 'API key required in X-API-Key header',
          code: 'AUTH_MISSING'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate API key and get permissions
    console.log('[AUTH] Looking up API key in database');
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('user_id, permissions, active')
      .eq('api_key', apiKey)
      .eq('active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      console.error('[AUTH] API key validation failed:', apiKeyError?.message || 'Key not found');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or inactive API key',
          code: 'AUTH_INVALID'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[AUTH] API key validated successfully');

    // Check permissions
    const permissions = apiKeyData.permissions as any;
    if (!permissions?.categorias?.read) {
      console.log('[PERM] Insufficient permissions for categorias.read');
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient permissions for this endpoint',
          code: 'PERM_DENIED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[PERM] Permissions validated successfully');

    // Update last used timestamp
    console.log('[UPDATE] Updating last_used timestamp');
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('api_key', apiKey);

    if (updateError) {
      console.warn('[UPDATE] Failed to update last_used:', updateError.message);
      // Don't fail the request for this
    } else {
      console.log('[UPDATE] Last_used timestamp updated successfully');
    }

    // Parse query parameters
    const active = url.searchParams.get('active');
    console.log('[PARAMS] Query parameters:', { active });

    // Build query
    console.log('[QUERY] Building categories query');
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
      console.log('[FILTER] Applying active filter:', active);
      query = query.eq('active', active === 'true');
    }

    console.log('[QUERY] Executing categories query');
    const { data: categories, error: categoriesError } = await query;

    if (categoriesError) {
      console.error('[QUERY] Error fetching categories:', categoriesError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar categorias',
          code: 'QUERY_ERROR',
          details: categoriesError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[QUERY] Found ${categories?.length || 0} categories`);

    // Validate categories data before processing
    if (!categories) {
      console.log('[RESULT] No categories returned from query');
      return new Response(
        JSON.stringify({
          success: true,
          data: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process categories safely
    console.log('[PROCESS] Processing categories data');
    try {
      const processedCategories = categories.map((category, index) => {
        console.log(`[PROCESS] Processing category ${index + 1}/${categories.length}: ${category.name}`);
        return {
          id: category.id,
          nome: category.name,
          slug: category.slug,
          icone: category.icon || '',
          cor: category.color || '#000000',
          imagem_url: category.image_url,
          total_produtos: Number(category.product_count) || 0,
          ativo: Boolean(category.active),
          criado_em: category.created_at,
          atualizado_em: category.updated_at
        };
      });

      console.log('[PROCESS] Categories processed successfully');
      console.log(`[RESPONSE] Returning ${processedCategories.length} categories`);
      
      return new Response(
        JSON.stringify({
          success: true,
          data: processedCategories
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (processingError) {
      console.error('[PROCESS] Error processing categories data:', processingError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar dados das categorias',
          code: 'PROCESSING_ERROR',
          details: processingError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[FATAL] Unhandled error in api-categorias-listar:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        code: 'FATAL_ERROR',
        details: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});