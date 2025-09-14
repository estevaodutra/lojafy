import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.log('Missing API key');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key is required. Include X-API-Key header.' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify API key and get permissions
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, permissions, active')
      .eq('api_key', apiKey)
      .single();

    if (apiKeyError || !apiKeyData || !apiKeyData.active) {
      console.log('Invalid or inactive API key:', apiKeyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid or inactive API key' 
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if API key has permission to read categories
    const permissions = apiKeyData.permissions as any;
    if (!permissions?.categorias?.read) {
      console.log('Insufficient permissions for categories read');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API key does not have permission to read categories' 
        }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update last_used timestamp for API key
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Parse query parameters
    const url = new URL(req.url);
    const categoryId = url.searchParams.get('category_id');
    const active = url.searchParams.get('active');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const search = url.searchParams.get('search');

    // category_id parameter is now optional

    // Build query
    let query = supabase
      .from('subcategories')
      .select(`
        id,
        name,
        slug,
        active,
        created_at,
        updated_at,
        category_id,
        categories!inner(
          id,
          name,
          slug
        )
      `);

    // Apply category filter if provided
    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    // Apply filters
    if (active !== null) {
      query = query.eq('active', active === 'true');
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Order by name
    query = query.order('name');

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);

    const { data: subcategories, error: subcategoriesError } = await query;

    if (subcategoriesError) {
      console.error('Error fetching subcategories:', subcategoriesError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Error fetching subcategories' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get product counts for each subcategory
    const subcategoryIds = subcategories?.map(s => s.id) || [];
    let productCounts: { [key: string]: number } = {};

    if (subcategoryIds.length > 0) {
      const { data: productCountData } = await supabase
        .from('products')
        .select('subcategory_id')
        .in('subcategory_id', subcategoryIds)
        .eq('active', true);

      // Count products per subcategory
      productCountData?.forEach(product => {
        if (product.subcategory_id) {
          productCounts[product.subcategory_id] = (productCounts[product.subcategory_id] || 0) + 1;
        }
      });
    }

    // Format response data
    const formattedData = subcategories?.map(subcategory => ({
      id: subcategory.id,
      nome: subcategory.name,
      slug: subcategory.slug,
      categoria_pai: {
        id: subcategory.categories.id,
        nome: subcategory.categories.name,
        slug: subcategory.categories.slug
      },
      total_produtos: productCounts[subcategory.id] || 0,
      ativo: subcategory.active,
      criado_em: subcategory.created_at,
      atualizado_em: subcategory.updated_at
    })) || [];

    // Get total count for pagination (without limit)
    let countQuery = supabase
      .from('subcategories')
      .select('*', { count: 'exact', head: true });

    // Apply category filter if provided
    if (categoryId) {
      countQuery = countQuery.eq('category_id', categoryId);
    }

    if (active !== null) {
      countQuery = countQuery.eq('active', active === 'true');
    }

    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }

    const { count } = await countQuery;
    const total = count || 0;
    const totalPages = Math.ceil(total / limit);

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

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});