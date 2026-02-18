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

// Control fields that are extracted from body (not stored in data JSONB)
const CONTROL_FIELDS = ['product_id', 'marketplace', 'listing_id', 'listing_url', 'listing_status'];

// Fields that should NOT be stored in data JSONB (they come from the Lojafy product at publish time)
const FORBIDDEN_DATA_FIELDS = ['price', 'available_quantity', 'attributes', 'listing_type_id', 'buying_mode', 'currency_id'];

// Valid listing_type values
const VALID_LISTING_TYPES = ['classic', 'premium'];

// Helper: Convert Lojafy listing_type to Mercado Livre listing_type_id
export function getMLListingType(lojafyType: string): string {
  const map: Record<string, string> = {
    classic: 'gold_special',
    premium: 'gold_pro',
  };
  return map[lojafyType] || 'gold_special';
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

  const method = req.method;
  const endpoint = pathParts[1]; // "products" or "mercadolivre"
  const subEndpoint = pathParts[2]; // id, "by-product", "unpublished"
  const subId = pathParts[3]; // productId (when by-product)

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

    await supabase.from('api_keys').update({ last_used: new Date().toISOString() }).eq('id', keyData.id);
  }

  try {
    // ============================================
    // POST /products - Criar/Atualizar dados marketplace (upsert)
    // ============================================
    if (method === 'POST' && endpoint === 'products' && !subEndpoint) {
      const body = await req.json();

      if (!body.product_id) return jsonResponse({ success: false, error: 'product_id é obrigatório' }, 400);
      if (!body.marketplace) return jsonResponse({ success: false, error: 'marketplace é obrigatório' }, 400);

      // Verify product exists
      const { data: productExists, error: productError } = await supabase
        .from('products')
        .select('id, name')
        .eq('id', body.product_id)
        .single();

      if (productError || !productExists) {
        return jsonResponse({ success: false, error: 'Produto não encontrado na tabela products' }, 404);
      }

      // Validate listing_type if provided
      if (body.listing_type && !VALID_LISTING_TYPES.includes(body.listing_type)) {
        return jsonResponse({ success: false, error: `listing_type deve ser: ${VALID_LISTING_TYPES.join(', ')}` }, 400);
      }

      // Default listing_type to classic
      if (!body.listing_type) {
        body.listing_type = 'classic';
      }

      // Extract control fields, everything else goes into data JSONB
      const dataPayload = { ...body };
      for (const field of [...CONTROL_FIELDS, ...FORBIDDEN_DATA_FIELDS]) {
        delete dataPayload[field];
      }

      const { data, error } = await supabase
        .from('product_marketplace_data')
        .upsert(
          {
            product_id: body.product_id,
            marketplace: body.marketplace,
            data: dataPayload,
            listing_id: body.listing_id || null,
            listing_url: body.listing_url || null,
            listing_status: body.listing_status || 'draft',
          },
          { onConflict: 'product_id,marketplace' }
        )
        .select()
        .single();

      if (error) throw error;

      console.log(`[lojafy-integra] Product upserted: ${data.id} for marketplace ${body.marketplace}`);

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
    // GET /products - Listar com filtros
    // ============================================
    if (method === 'GET' && endpoint === 'products' && !subEndpoint) {
      const marketplace = url.searchParams.get('marketplace');
      const listingStatus = url.searchParams.get('listing_status');
      const productId = url.searchParams.get('product_id');
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
      const offset = (page - 1) * limit;

      let query = supabase
        .from('product_marketplace_data')
        .select(`
          *,
          products:product_id (
            id, name, main_image_url, sku, gtin_ean13, price, stock_quantity
          )
        `, { count: 'exact' });

      if (marketplace) query = query.eq('marketplace', marketplace);
      if (listingStatus) query = query.eq('listing_status', listingStatus);
      if (productId) query = query.eq('product_id', productId);

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
        query_params: { marketplace, listing_status: listingStatus, product_id: productId, page, limit } as Record<string, unknown>,
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

      // Get product IDs already registered for this marketplace
      let existingQuery = supabase
        .from('product_marketplace_data')
        .select('product_id')
        .eq('marketplace', marketplace);
      const { data: existing } = await existingQuery;
      const existingIds = (existing || []).map((e: { product_id: string }) => e.product_id);

      // Find 1 active product NOT in the list
      let productQuery = supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (existingIds.length > 0) {
        productQuery = productQuery.not('id', 'in', `(${existingIds.join(',')})`);
      }

      const { data: product, error } = await productQuery.maybeSingle();
      if (error) throw error;

      // Get active OAuth credentials
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
    if (method === 'GET' && endpoint === 'products' && subEndpoint && subEndpoint !== 'by-product' && subEndpoint !== 'unpublished') {
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

      const updateFields: Record<string, unknown> = {};

      // Update control fields if provided
      if (body.listing_id !== undefined) updateFields.listing_id = body.listing_id;
      if (body.listing_url !== undefined) updateFields.listing_url = body.listing_url;
      if (body.listing_status !== undefined) updateFields.listing_status = body.listing_status;
      if (body.published_at !== undefined) updateFields.published_at = body.published_at;
      if (body.last_sync_at !== undefined) updateFields.last_sync_at = body.last_sync_at;

      // Update data JSONB if provided
      if (body.data !== undefined) updateFields.data = body.data;

      const { data, error } = await supabase
        .from('product_marketplace_data')
        .update(updateFields)
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
        request_body: { updated_fields: Object.keys(updateFields) },
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
