import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function parseBoolean(param: string | null): boolean | null {
  if (param === null) return null;
  const v = param.toLowerCase();
  if (['1','true','yes','on'].includes(v)) return true;
  if (['0','false','no','off'].includes(v)) return false;
  return null;
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting api-subcategorias-listar request`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Environment validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('[ENV] SUPABASE_URL:', supabaseUrl ? 'Present' : 'Missing');
    console.log('[ENV] SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Present' : 'Missing');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[ENV] Missing environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Server configuration error',
          code: 'ENV_001'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse query parameters first for health check
    const url = new URL(req.url);
    const healthCheck = url.searchParams.get('health');
    
    if (healthCheck === '1') {
      console.log('[HEALTH] Health check requested');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Subcategories API is healthy',
          timestamp: new Date().toISOString(),
          responseTime: `${Date.now() - startTime}ms`
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate API key
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    console.log('[AUTH] API key:', apiKey ? 'Present' : 'Missing');
    
    if (!apiKey) {
      console.log('[AUTH] Missing API key');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key is required. Include X-API-Key header.',
          code: 'AUTH_001'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[AUTH] Looking up API key in database');
    
    // Verify API key and get permissions - use maybeSingle to avoid errors
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, permissions, active')
      .eq('api_key', apiKey)
      .eq('active', true)
      .maybeSingle();

    if (apiKeyError) {
      console.error('[AUTH] Database error during API key lookup:', apiKeyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Authentication system error',
          code: 'AUTH_002'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!apiKeyData) {
      console.log('[AUTH] API key not found or inactive');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or inactive API key',
          code: 'AUTH_003'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[AUTH] API key validated successfully');

    // Check if API key has permission to read subcategories or categories
    const permissions = apiKeyData.permissions as any;
    const hasSubcategoriesRead = permissions?.subcategorias?.read || permissions?.categorias?.read;
    
    if (!hasSubcategoriesRead) {
      console.log('[PERM] Insufficient permissions for subcategories read');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key does not have permission to read subcategories',
          code: 'PERM_001'
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('[PERM] Permissions validated successfully');
    console.log('[UPDATE] Updating last_used timestamp');

    // Update last_used timestamp for API key
    const { error: updateError } = await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);
    
    if (updateError) {
      console.warn('[UPDATE] Failed to update last_used timestamp:', updateError);
    } else {
      console.log('[UPDATE] Last_used timestamp updated successfully');
    }

    // Parse remaining query parameters
    const categoryId = url.searchParams.get('category_id');
    const active = url.searchParams.get('active');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const search = url.searchParams.get('search');
    const withCounts = parseBoolean(url.searchParams.get('with_counts')) ?? false;

    console.log('[PARAMS] Query parameters:', { 
      categoryId, 
      active, 
      page, 
      limit, 
      search,
      withCounts,
    });

    console.log('[QUERY] Building subcategories query');

    // Build subcategories query without inner join
    let query = supabase
      .from('subcategories')
      .select('id, name, slug, active, created_at, updated_at, category_id');

    // Apply category filter if provided
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Apply filters
    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    if (search) {
      const s = `%${search}%`;
      query = query.or(`name.ilike.${s},slug.ilike.${s}`);
    }

    // Order by name
    query = query.order('name');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    console.log('[QUERY] Executing subcategories query');
    const { data: subcategories, error: subcategoriesError } = await query;

    if (subcategoriesError) {
      console.error('[QUERY] Error fetching subcategories:', subcategoriesError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error fetching subcategories',
          code: 'QUERY_001'
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[QUERY] Found', subcategories?.length || 0, 'subcategories');

    if (!subcategories || subcategories.length === 0) {
      console.log('[QUERY] No subcategories found');
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get unique category IDs to fetch category data
    const categoryIds = [...new Set(subcategories.map(s => s.category_id))];
    console.log('[CATEGORIES] Fetching categories for', categoryIds.length, 'unique category IDs');
    
    let categoriesMap: { [key: string]: any } = {};
    
    if (categoryIds.length > 0) {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, slug')
        .in('id', categoryIds);
      
      if (categoriesError) {
        console.error('[CATEGORIES] Error fetching categories:', categoriesError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Error fetching category data',
            code: 'QUERY_002'
          }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // Create categories map for quick lookup
      categories?.forEach(cat => {
        categoriesMap[cat.id] = cat;
      });
      
      console.log('[CATEGORIES] Successfully fetched', categories?.length || 0, 'categories');
    }

    // Optional product counts for current page only
    const subcategoryIds = subcategories.map(s => s.id);
    let productCounts: { [key: string]: number } = {};

    if (withCounts && subcategoryIds.length > 0) {
      console.log('[PRODUCTS] Computing product counts via HEAD for', subcategoryIds.length, 'subcategories');
      await Promise.all(
        subcategories.map(async (s) => {
          try {
            const { count, error } = await supabase
              .from('products')
              .select('*', { count: 'exact', head: true })
              .eq('subcategory_id', s.id)
              .eq('active', true);
            if (error) {
              console.warn('[PRODUCTS] Count failed for subcategory', s.id, error);
              productCounts[s.id] = 0;
            } else {
              productCounts[s.id] = count ?? 0;
            }
          } catch (e) {
            console.warn('[PRODUCTS] Count exception for subcategory', s.id, e);
            productCounts[s.id] = 0;
          }
        })
      );
    } else {
      console.log('[PRODUCTS] Skipping product counts (with_counts=false)');
    }

    console.log('[PROCESS] Processing subcategories data');
    
    // Format response data
    const formattedData = subcategories.map(subcategory => {
      const category = categoriesMap[subcategory.category_id];
      const base: any = {
        id: subcategory.id,
        nome: subcategory.name,
        slug: subcategory.slug,
        categoria_pai: category ? {
          id: category.id,
          nome: category.name,
          slug: category.slug
        } : null,
        ativo: subcategory.active,
        criado_em: subcategory.created_at,
        atualizado_em: subcategory.updated_at
      };
      if (withCounts) {
        base.total_produtos = productCounts[subcategory.id] || 0;
      }
      return base;
    });

    console.log('[PROCESS] Subcategories processed successfully');

    // Get total count for pagination (without limit)
    console.log('[PAGINATION] Calculating total count');
    
    let countQuery = supabase
      .from('subcategories')
      .select('*', { count: 'exact', head: true });

    // Apply same filters as main query for accurate count
    if (categoryId) {
      countQuery = countQuery.eq('category_id', categoryId);
    }

    if (active !== null) {
      countQuery = countQuery.eq('active', active === 'true');
    }

    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }

    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.warn('[PAGINATION] Error getting total count:', countError);
    }
    
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);
    
    console.log('[PAGINATION] Total count:', total, 'Total pages:', totalPages);

    const responseData = {
      success: true,
      data: formattedData,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };

    console.log('[RESPONSE] Returning', formattedData.length, 'subcategories');
    console.log('[RESPONSE] Total response time:', `${Date.now() - startTime}ms`);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ERROR] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        code: 'SERVER_001'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});