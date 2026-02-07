import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { logApiRequest, getClientIp } from '../_shared/logApiRequest.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const startTime = Date.now();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  // pathParts: ["lojafy-integra", "products", ...]


  const method = req.method;
  const endpoint = pathParts[1]; // "products"
  const subEndpoint = pathParts[2]; // id, "by-product", "bulk"
  const subId = pathParts[3]; // productId (quando by-product)

  const ipAddress = getClientIp(req);

  // Validate API key
  const apiKey = req.headers.get('x-api-key');
  let apiKeyId: string | null = null;
  let userId: string | null = null;

  if (apiKey) {
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, permissions, active')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.active) {
      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        ip_address: ipAddress,
        status_code: 401,
        duration_ms: Date.now() - startTime,
        error_message: 'API Key inválida ou desativada',
      });
      return jsonResponse({ success: false, error: 'API Key inválida ou desativada' }, 401);
    }

    apiKeyId = keyData.id;
    userId = keyData.user_id;

    // Update last_used
    await supabase.from('api_keys').update({ last_used: new Date().toISOString() }).eq('id', keyData.id);
  }

  try {
    // ============================================
    // POST /products - Criar produto
    // ============================================
    if (method === 'POST' && endpoint === 'products' && !subEndpoint) {
      const body = await req.json();

      // Validações
      if (!body.product_id) return jsonResponse({ success: false, error: 'product_id é obrigatório' }, 400);
      if (!body.marketplace) return jsonResponse({ success: false, error: 'marketplace é obrigatório' }, 400);
      if (!body.title) return jsonResponse({ success: false, error: 'title é obrigatório' }, 400);
      if (!body.price || body.price <= 0) return jsonResponse({ success: false, error: 'price é obrigatório e deve ser maior que zero' }, 400);

      // Verificar se produto original existe
      const { data: productExists, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', body.product_id)
        .single();

      if (productError || !productExists) {
        console.error('[lojafy-integra] Product not found:', body.product_id);
        return jsonResponse({ success: false, error: 'Produto não encontrado na tabela products' }, 404);
      }

      const { data, error } = await supabase
        .from('product_marketplace_data')
        .insert({
          product_id: body.product_id,
          user_id: body.user_id || userId,
          marketplace: body.marketplace,
          title: body.title,
          description: body.description,
          price: body.price,
          promotional_price: body.promotional_price,
          category_id: body.category_id,
          category_name: body.category_name,
          attributes: body.attributes || {},
          variations: body.variations || [],
          stock_quantity: body.stock_quantity || 0,
          images: body.images || [],
          status: body.status || 'draft',
          listing_type: body.listing_type,
          marketplace_metadata: body.marketplace_metadata || {},
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return jsonResponse({ success: false, error: 'Este produto já existe para este marketplace' }, 409);
        }
        throw error;
      }

      console.log(`[lojafy-integra] Product created: ${data.id} for marketplace ${body.marketplace}`);

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 201,
        duration_ms: Date.now() - startTime,
        request_body: { product_id: body.product_id, marketplace: body.marketplace },
        response_summary: { success: true, id: data.id },
      });

      return jsonResponse({ success: true, data }, 201);
    }

    // ============================================
    // POST /products/bulk - Criar múltiplos
    // ============================================
    if (method === 'POST' && endpoint === 'products' && subEndpoint === 'bulk') {
      const body = await req.json();

      if (!Array.isArray(body.products) || body.products.length === 0) {
        return jsonResponse({ success: false, error: 'products deve ser um array não vazio' }, 400);
      }

      // Set user_id on each product if not provided
      const productsWithUser = body.products.map((p: Record<string, unknown>) => ({
        ...p,
        user_id: p.user_id || userId,
      }));

      const { data, error } = await supabase
        .from('product_marketplace_data')
        .insert(productsWithUser)
        .select();

      if (error) throw error;

      console.log(`[lojafy-integra] Bulk created: ${data.length} products`);

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 201,
        duration_ms: Date.now() - startTime,
        request_body: { count: body.products.length },
        response_summary: { success: true, count: data.length },
      });

      return jsonResponse({ success: true, data, count: data.length }, 201);
    }

    // ============================================
    // GET /products - Listar produtos
    // ============================================
    if (method === 'GET' && endpoint === 'products' && !subEndpoint) {
      const marketplace = url.searchParams.get('marketplace');
      const status = url.searchParams.get('status');
      const filterUserId = url.searchParams.get('user_id');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('product_marketplace_data')
        .select(`
          *,
          products:product_id (
            id,
            name,
            main_image_url,
            sku,
            gtin_ean13
          )
        `, { count: 'exact' });

      if (marketplace) query = query.eq('marketplace', marketplace);
      if (status) query = query.eq('status', status);
      if (filterUserId) query = query.eq('user_id', filterUserId);

      query = query.order('created_at', { ascending: false });
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 200,
        duration_ms: Date.now() - startTime,
        query_params: { marketplace, status, page, limit } as Record<string, unknown>,
        response_summary: { success: true, count },
      });

      return jsonResponse({
        success: true,
        data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    }

    // ============================================
    // GET /products/unpublished?marketplace=...
    // ============================================
    if (method === 'GET' && endpoint === 'products' && subEndpoint === 'unpublished') {
      const marketplace = url.searchParams.get('marketplace');
      if (!marketplace) {
        return jsonResponse({ success: false, error: 'marketplace é obrigatório' }, 400);
      }

      const filterUserId = url.searchParams.get('user_id');

      // Buscar IDs de produtos já cadastrados neste marketplace
      let existingQuery = supabase
        .from('product_marketplace_data')
        .select('product_id')
        .eq('marketplace', marketplace);
      if (filterUserId) existingQuery = existingQuery.eq('user_id', filterUserId);
      const { data: existing } = await existingQuery;
      const existingIds = (existing || []).map((e: { product_id: string }) => e.product_id);

      // Buscar 1 produto ativo que NAO esta na lista
      let productQuery = supabase
        .from('products')
        .select('id, name, description, price, sku, gtin_ean13, main_image_url, brand, stock_quantity, category_id')
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (existingIds.length > 0) {
        productQuery = productQuery.not('id', 'in', `(${existingIds.join(',')})`);
      }

      const { data: product, error } = await productQuery.maybeSingle();
      if (error) throw error;

      // Buscar credenciais OAuth ativas
      let oauthQuery = supabase
        .from('mercadolivre_integrations')
        .select('user_id, access_token, token_type, refresh_token, expires_at, ml_user_id')
        .eq('is_active', true);

      if (filterUserId) {
        oauthQuery = oauthQuery.eq('user_id', filterUserId);
      }

      const { data: oauth, error: oauthError } = await oauthQuery.limit(1).maybeSingle();
      if (oauthError) {
        console.error('[lojafy-integra] OAuth lookup error:', oauthError);
      }

      console.log(`[lojafy-integra] Unpublished product lookup for ${marketplace}: ${product ? product.id : 'none found'}, oauth: ${oauth ? 'found' : 'not found'}`);

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 200,
        duration_ms: Date.now() - startTime,
        query_params: { marketplace, user_id: filterUserId } as Record<string, unknown>,
        response_summary: { success: true, has_product: !!product, has_oauth: !!oauth },
      });

      return jsonResponse({
        success: true,
        data: product,
        marketplace,
        oauth: oauth || null,
        remaining: product ? 'Existem mais produtos pendentes' : 'Todos os produtos já estão cadastrados'
      });
    }

    // ============================================
    // GET /products/by-product/:productId
    // ============================================
    if (method === 'GET' && endpoint === 'products' && subEndpoint === 'by-product' && subId) {
      const { data, error } = await supabase
        .from('product_marketplace_data')
        .select('*')
        .eq('product_id', subId);

      if (error) throw error;

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 200,
        duration_ms: Date.now() - startTime,
        query_params: { product_id: subId },
        response_summary: { success: true, count: data?.length },
      });

      return jsonResponse({ success: true, data });
    }

    // ============================================
    // GET /products/:id - Buscar por ID
    // ============================================
    if (method === 'GET' && endpoint === 'products' && subEndpoint && subEndpoint !== 'by-product' && subEndpoint !== 'bulk') {
      const { data, error } = await supabase
        .from('product_marketplace_data')
        .select(`
          *,
          products:product_id (*)
        `)
        .eq('id', subEndpoint)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return jsonResponse({ success: false, error: 'Produto não encontrado' }, 404);
        }
        throw error;
      }

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 200,
        duration_ms: Date.now() - startTime,
        response_summary: { success: true, id: data.id },
      });

      return jsonResponse({ success: true, data });
    }

    // ============================================
    // PUT /products/:id - Atualizar
    // ============================================
    if (method === 'PUT' && endpoint === 'products' && subEndpoint) {
      const body = await req.json();

      // Proteger campos imutáveis
      delete body.id;
      delete body.product_id;
      delete body.created_at;

      const { data, error } = await supabase
        .from('product_marketplace_data')
        .update(body)
        .eq('id', subEndpoint)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return jsonResponse({ success: false, error: 'Produto não encontrado' }, 404);
        }
        throw error;
      }

      console.log(`[lojafy-integra] Product updated: ${data.id}`);

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 200,
        duration_ms: Date.now() - startTime,
        request_body: { updated_fields: Object.keys(body) },
        response_summary: { success: true, id: data.id },
      });

      return jsonResponse({ success: true, data });
    }

    // ============================================
    // DELETE /products/:id - Remover
    // ============================================
    if (method === 'DELETE' && endpoint === 'products' && subEndpoint) {
      const { data, error } = await supabase
        .from('product_marketplace_data')
        .delete()
        .eq('id', subEndpoint)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return jsonResponse({ success: false, error: 'Produto não encontrado' }, 404);
        }
        throw error;
      }

      console.log(`[lojafy-integra] Product deleted: ${data.id}`);

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 200,
        duration_ms: Date.now() - startTime,
        response_summary: { success: true, deleted_id: data.id },
      });

      return jsonResponse({ success: true, message: 'Produto removido', data });
    }

    // ============================================
    // GET /mercadolivre/expiring-tokens
    // Lista integrações com tokens próximos de expirar
    // ============================================
    if (method === 'GET' && endpoint === 'mercadolivre' && subEndpoint === 'expiring-tokens') {
      const minutes = parseInt(url.searchParams.get('minutes') || '60');
      const includeExpired = url.searchParams.get('include_expired') === 'true';

      const now = new Date();
      const threshold = new Date(now.getTime() + minutes * 60 * 1000);

      let query = supabase
        .from('mercadolivre_integrations')
        .select('id, user_id, ml_user_id, refresh_token, expires_at, is_active')
        .eq('is_active', true)
        .lt('expires_at', threshold.toISOString());

      if (!includeExpired) {
        query = query.gt('expires_at', now.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const enrichedData = (data || []).map((integration: Record<string, unknown>) => {
        const expiresAt = new Date(integration.expires_at as string);
        const minutesUntilExpiration = Math.round((expiresAt.getTime() - now.getTime()) / 60000);
        return {
          ...integration,
          minutes_until_expiration: minutesUntilExpiration,
          is_expired: minutesUntilExpiration < 0,
        };
      });

      console.log(`[lojafy-integra] Expiring tokens check: ${enrichedData.length} found (threshold: ${minutes}min, include_expired: ${includeExpired})`);

      await logApiRequest({
        function_name: 'lojafy-integra',
        method,
        path: url.pathname,
        api_key_id: apiKeyId || undefined,
        user_id: userId || undefined,
        ip_address: ipAddress,
        status_code: 200,
        duration_ms: Date.now() - startTime,
        query_params: { minutes, include_expired: includeExpired } as Record<string, unknown>,
        response_summary: { success: true, count: enrichedData.length },
      });

      return jsonResponse({
        success: true,
        data: enrichedData,
        count: enrichedData.length,
        checked_at: now.toISOString(),
        threshold_minutes: minutes,
      });
    }

    // Endpoint não encontrado
    return jsonResponse({ success: false, error: 'Endpoint não encontrado' }, 404);
  } catch (error) {
    console.error('[lojafy-integra] Error:', error);

    await logApiRequest({
      function_name: 'lojafy-integra',
      method,
      path: url.pathname,
      api_key_id: apiKeyId || undefined,
      user_id: userId || undefined,
      ip_address: ipAddress,
      status_code: 500,
      duration_ms: Date.now() - startTime,
      error_message: error.message,
    });

    return jsonResponse({ success: false, error: error.message || 'Erro interno do servidor' }, 500);
  }
});
