import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[API] Requisição recebida para listar produtos aguardando aprovação');

    const apiKey = req.headers.get('X-API-Key');
    if (!apiKey) {
      console.error('[API] API Key não fornecida');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API Key não fornecida. Inclua o header X-API-Key.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verificar API Key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('[API] API Key inválida ou inativa:', apiKeyError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'API Key inválida ou inativa' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar permissões de leitura
    const permissions = apiKeyData.permissions as any;
    if (!permissions?.produtos?.read) {
      console.error('[API] Permissões insuficientes para leitura de produtos');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Permissões insuficientes. Esta API Key não tem permissão de leitura para produtos.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar last_used da API Key
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Parsing de query params
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const search = url.searchParams.get('search');
    const supplier_id = url.searchParams.get('supplier_id');
    const created_by = url.searchParams.get('created_by');

    console.log('[API] Parâmetros:', { page, limit, search, supplier_id, created_by });

    // Construir query
    let query = supabase
      .from('products')
      .select(`
        id,
        name,
        description,
        price,
        original_price,
        cost_price,
        stock_quantity,
        sku,
        gtin_ean13,
        brand,
        active,
        high_rotation,
        approval_status,
        requires_approval,
        rejection_reason,
        approved_by,
        approved_at,
        rejected_at,
        created_by,
        supplier_id,
        reference_ad_url,
        image_url,
        main_image_url,
        images,
        specifications,
        badge,
        rating,
        review_count,
        featured,
        height,
        width,
        length,
        weight,
        min_stock_level,
        low_stock_alert,
        use_auto_pricing,
        category_id,
        subcategory_id,
        created_at,
        updated_at,
        categories:category_id(
          id,
          name,
          slug,
          image_url,
          active
        ),
        subcategories:subcategory_id(
          id,
          name,
          slug
        )
      `, { count: 'exact' })
      .eq('approval_status', 'pending_approval')
      .order('created_at', { ascending: false });

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    if (created_by) {
      query = query.eq('created_by', created_by);
    }

    // Paginação
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: products, error: productsError, count } = await query;

    if (productsError) {
      console.error('[API] Erro ao buscar produtos:', productsError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Erro ao buscar produtos: ' + productsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar informações de fornecedores e criadores
    const supplierIds = [...new Set(products?.map(p => p.supplier_id).filter(Boolean))];
    const creatorIds = [...new Set(products?.map(p => p.created_by).filter(Boolean))];
    const allUserIds = [...new Set([...supplierIds, ...creatorIds])];

    let usersData: any = {};
    if (allUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', allUserIds);

      if (profiles) {
        usersData = profiles.reduce((acc: any, profile: any) => {
          acc[profile.user_id] = {
            id: profile.user_id,
            full_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Usuário',
          };
          return acc;
        }, {});
      }
    }

    // Enriquecer dados com informações de usuários
    const enrichedProducts = products?.map(product => ({
      ...product,
      supplier: product.supplier_id ? usersData[product.supplier_id] : null,
      created_by_user: product.created_by ? usersData[product.created_by] : null,
    }));

    // Calcular summary por fornecedor
    const summaryBySupplier = supplierIds.map(supplierId => {
      const supplierProducts = products?.filter(p => p.supplier_id === supplierId) || [];
      return {
        supplier_id: supplierId,
        name: usersData[supplierId]?.full_name || 'Fornecedor',
        total: supplierProducts.length,
      };
    }).filter(s => s.total > 0);

    // Calcular paginação
    const totalPages = Math.ceil((count || 0) / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    console.log(`[API] Sucesso: ${products?.length || 0} produtos retornados`);

    return new Response(
      JSON.stringify({
        success: true,
        data: enrichedProducts || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNext,
          hasPrev,
        },
        summary: {
          total_aguardando: count || 0,
          por_fornecedor: summaryBySupplier,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[API] Erro não tratado:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Erro interno do servidor: ' + (error as Error).message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
