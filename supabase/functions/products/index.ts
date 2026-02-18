import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errorResponse(error: string, status = 400) {
  return jsonResponse({ error }, status);
}

async function logApiRequest(supabase: any, data: any) {
  try {
    await supabase.from('api_request_logs').insert(data);
  } catch (e) { console.error('[LOG_ERROR]', e); }
}

const VALID_CONDITIONS = ['new', 'used', 'refurbished', 'not_specified'];

// Normaliza atributos para o formato ML: { id, name, value_id, value_name, values: [{ id, name }] }
function normalizeAttributes(attrs: any[]): any[] {
  if (!Array.isArray(attrs)) return [];
  return attrs.map((attr: any) => {
    const valueName = attr.value_name ?? attr.value ?? null;
    const valueId = attr.value_id ?? null;
    return {
      id: attr.id,
      name: attr.name,
      value_id: valueId,
      value_name: valueName,
      values: attr.values && Array.isArray(attr.values) && attr.values.length > 0
        ? attr.values
        : valueName != null ? [{ id: valueId, name: valueName }] : [],
    };
  });
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);
  let statusCode = 200;
  let errorMessage: string | null = null;
  let apiKeyId: string | null = null;

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // ── Autenticação via X-API-Key ──
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      statusCode = 401;
      errorMessage = 'API key required';
      return errorResponse('API key required in X-API-Key header', 401);
    }

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('id, user_id, permissions, active')
      .eq('api_key', apiKey)
      .eq('active', true)
      .maybeSingle();

    if (apiKeyError || !apiKeyData) {
      statusCode = 401;
      errorMessage = 'Invalid or inactive API key';
      return errorResponse('Invalid or inactive API key', 401);
    }

    apiKeyId = apiKeyData.id;
    const permissions = apiKeyData.permissions as any;
    const method = req.method;

    // ── Verificar permissões ──
    const requiredPermission = method === 'GET' ? 'read' : 'write';
    if (!permissions?.produtos?.[requiredPermission]) {
      statusCode = 403;
      errorMessage = `Insufficient permissions: produtos.${requiredPermission} required`;
      return errorResponse(`Permissão produtos.${requiredPermission} não concedida`, 403);
    }

    // Atualizar last_used
    await supabase.from('api_keys').update({ last_used: new Date().toISOString() }).eq('api_key', apiKey);

    // ── Roteamento ──
    const pathParts = url.pathname.split('/').filter(Boolean);
    const segment1 = pathParts[1]; // id or "pending"
    const productId = segment1 && segment1 !== 'pending' ? segment1 : null;
    const subResource = pathParts[2]; // "attributes", "variations", "approve", "reject"
    const subResourceId = pathParts[3]; // SKU for variations

    // ── POST /products ──
    if (method === 'POST' && !productId) {
      return await handleCreateProduct(supabase, req, apiKeyData.user_id);
    }

    // ── GET /products ──
    if (method === 'GET' && !productId && segment1 !== 'pending') {
      return await handleListProducts(supabase, url);
    }

    // ── GET /products/pending ──
    if (method === 'GET' && segment1 === 'pending') {
      return await handlePendingProducts(supabase);
    }

    // ── GET /products/:id ──
    if (method === 'GET' && productId && !subResource) {
      return await handleGetProduct(supabase, productId);
    }

    // ── PUT /products/:id ──
    if (method === 'PUT' && productId && !subResource) {
      return await handleUpdateProduct(supabase, req, productId);
    }

    // ── DELETE /products/:id ──
    if (method === 'DELETE' && productId && !subResource) {
      return await handleDeleteProduct(supabase, productId);
    }

    // ── PUT /products/:id/attributes ──
    if (method === 'PUT' && productId && subResource === 'attributes') {
      return await handleUpdateAttribute(supabase, req, productId);
    }

    // ── POST /products/:id/variations ──
    if (method === 'POST' && productId && subResource === 'variations') {
      return await handleAddVariation(supabase, req, productId);
    }

    // ── PUT /products/:id/variations/:sku ──
    if (method === 'PUT' && productId && subResource === 'variations' && subResourceId) {
      return await handleUpdateVariation(supabase, req, productId, decodeURIComponent(subResourceId));
    }

    // ── DELETE /products/:id/variations/:sku ──
    if (method === 'DELETE' && productId && subResource === 'variations' && subResourceId) {
      return await handleDeleteVariation(supabase, productId, decodeURIComponent(subResourceId));
    }

    // ── POST /products/:id/approve ──
    if (method === 'POST' && productId && subResource === 'approve') {
      return await handleApprove(supabase, productId, apiKeyData.user_id);
    }

    // ── POST /products/:id/reject ──
    if (method === 'POST' && productId && subResource === 'reject') {
      return await handleReject(supabase, req, productId);
    }

    statusCode = 404;
    errorMessage = 'Endpoint não encontrado';
    return errorResponse('Endpoint não encontrado', 404);
  } catch (error) {
    console.error('Erro na API de produtos:', error);
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return jsonResponse({ error: 'Erro interno do servidor', details: error.message }, 500);
  } finally {
    logApiRequest(supabase, {
      function_name: 'products',
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

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: POST /products
// ═══════════════════════════════════════════════════════════════════════════════
async function handleCreateProduct(supabase: any, req: Request, userId: string) {
  const body = await req.json();

  if (!body.name || String(body.name).trim() === '') {
    return errorResponse('name é obrigatório');
  }
  if (!body.price || body.price <= 0) {
    return errorResponse('price é obrigatório e deve ser maior que zero');
  }
  if (body.attributes !== undefined && !Array.isArray(body.attributes)) {
    return errorResponse('attributes deve ser um array');
  }
  if (body.variations !== undefined && !Array.isArray(body.variations)) {
    return errorResponse('variations deve ser um array');
  }
  if (body.condition && !VALID_CONDITIONS.includes(body.condition)) {
    return errorResponse(`condition deve ser: ${VALID_CONDITIONS.join(', ')}`);
  }

  const hasVariations = body.variations && body.variations.length > 0;
  const attrs = body.attributes || [];

  const { data, error } = await supabase
    .from('products')
    .insert({
      name: body.name.trim(),
      description: body.description,
      short_description: body.short_description,
      price: body.price,
      original_price: body.original_price,
      cost_price: body.cost_price,
      use_auto_pricing: body.use_auto_pricing ?? true,
      sku: body.sku,
      gtin_ean13: body.gtin_ean13,
      brand: body.brand,
      category_id: body.category_id,
      subcategory_id: body.subcategory_id,
      domain_id: body.domain_id,
      main_image_url: body.main_image_url,
      image_url: body.image_url || body.main_image_url,
      images: body.images || [],
      video_url: body.video_url,
      stock_quantity: body.stock_quantity ?? 0,
      min_stock_level: body.min_stock_level ?? 5,
      low_stock_alert: body.low_stock_alert ?? true,
      height: body.height,
      width: body.width,
      length: body.length,
      weight: body.weight,
      attributes: normalizeAttributes(attrs),
      variations: body.variations || [],
      has_variations: hasVariations,
      specifications: body.specifications || {},
      active: body.active ?? true,
      featured: body.featured ?? false,
      condition: body.condition || 'new',
      badge: body.badge,
      high_rotation: body.high_rotation ?? false,
      approval_status: body.requires_approval ? 'pending' : 'approved',
      requires_approval: body.requires_approval ?? false,
      supplier_id: body.supplier_id,
      created_by: userId,
      reference_ad_url: body.reference_ad_url,
      catalog_source: body.catalog_source,
      catalog_source_id: body.catalog_source_id,
      enriched_at: attrs.length > 0 ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar produto:', error);
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ success: true, data }, 201);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: GET /products
// ═══════════════════════════════════════════════════════════════════════════════
async function handleListProducts(supabase: any, url: URL) {
  let query = supabase
    .from('products')
    .select('*, categories(id, name), subcategories(id, name)', { count: 'exact' });

  const filters: Record<string, string | null> = {
    active: url.searchParams.get('active'),
    featured: url.searchParams.get('featured'),
    category_id: url.searchParams.get('category_id'),
    subcategory_id: url.searchParams.get('subcategory_id'),
    supplier_id: url.searchParams.get('supplier_id'),
    domain_id: url.searchParams.get('domain_id'),
    condition: url.searchParams.get('condition'),
    has_variations: url.searchParams.get('has_variations'),
    approval_status: url.searchParams.get('approval_status'),
  };

  for (const [key, val] of Object.entries(filters)) {
    if (val === null) continue;
    if (key === 'active' || key === 'featured' || key === 'has_variations') {
      query = query.eq(key, val === 'true');
    } else {
      query = query.eq(key, val);
    }
  }

  const search = url.searchParams.get('search');
  if (search) {
    query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  const minPrice = url.searchParams.get('min_price');
  if (minPrice) query = query.gte('price', parseFloat(minPrice));

  const maxPrice = url.searchParams.get('max_price');
  if (maxPrice) query = query.lte('price', parseFloat(maxPrice));

  const orderBy = url.searchParams.get('order_by') || 'created_at';
  const orderDir = url.searchParams.get('order_dir') || 'desc';
  query = query.order(orderBy, { ascending: orderDir === 'asc' });

  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0');
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;

  return jsonResponse({
    success: true,
    data,
    pagination: { total: count, limit, offset, has_more: (count || 0) > offset + limit },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: GET /products/pending
// ═══════════════════════════════════════════════════════════════════════════════
async function handlePendingProducts(supabase: any) {
  const { data, error, count } = await supabase
    .from('products')
    .select('*, categories(id, name)', { count: 'exact' })
    .eq('approval_status', 'pending')
    .eq('requires_approval', true)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return jsonResponse({ success: true, data, total: count });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: GET /products/:id
// ═══════════════════════════════════════════════════════════════════════════════
async function handleGetProduct(supabase: any, productId: string) {
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name, slug), subcategories(id, name, slug)')
    .eq('id', productId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return errorResponse('Produto não encontrado', 404);
    throw error;
  }

  return jsonResponse({ success: true, data });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: PUT /products/:id
// ═══════════════════════════════════════════════════════════════════════════════
async function handleUpdateProduct(supabase: any, req: Request, productId: string) {
  const body = await req.json();

  delete body.id;
  delete body.created_at;
  delete body.created_by;
  delete body.approved_at;
  delete body.approved_by;
  delete body.rejected_at;

  if (body.name !== undefined && String(body.name).trim() === '') {
    return errorResponse('name não pode ser vazio');
  }
  if (body.price !== undefined && body.price <= 0) {
    return errorResponse('price deve ser maior que zero');
  }
  if (body.attributes !== undefined && !Array.isArray(body.attributes)) {
    return errorResponse('attributes deve ser um array');
  }
  if (body.variations !== undefined && !Array.isArray(body.variations)) {
    return errorResponse('variations deve ser um array');
  }
  if (body.condition && !VALID_CONDITIONS.includes(body.condition)) {
    return errorResponse(`condition deve ser: ${VALID_CONDITIONS.join(', ')}`);
  }

  if (body.variations !== undefined) {
    body.has_variations = body.variations.length > 0;
  }
  if (body.attributes !== undefined && body.attributes.length > 0) {
    body.enriched_at = new Date().toISOString();
  }
  if (body.main_image_url !== undefined) {
    body.image_url = body.main_image_url;
  }
  if (body.name) {
    body.name = body.name.trim();
  }
  body.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('products')
    .update(body)
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return errorResponse('Produto não encontrado', 404);
    console.error('Erro ao atualizar produto:', error);
    return jsonResponse({ error: error.message }, 400);
  }

  return jsonResponse({ success: true, data });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: DELETE /products/:id
// ═══════════════════════════════════════════════════════════════════════════════
async function handleDeleteProduct(supabase: any, productId: string) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) throw error;

  return jsonResponse({ success: true, message: 'Produto removido com sucesso' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: PUT /products/:id/attributes
// ═══════════════════════════════════════════════════════════════════════════════
async function handleUpdateAttribute(supabase: any, req: Request, productId: string) {
  const body = await req.json();

  if (!body.attribute_id) return errorResponse('attribute_id é obrigatório');
  const valueName = body.value_name ?? body.value;
  if (valueName === undefined || valueName === null) return errorResponse('value_name (ou value) é obrigatório');

  const { data: attrDef, error: attrError } = await supabase
    .from('attribute_definitions')
    .select('*')
    .eq('id', body.attribute_id)
    .single();

  if (attrError || !attrDef) {
    return errorResponse(`Atributo ${body.attribute_id} não encontrado`, 404);
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('attributes')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    return errorResponse('Produto não encontrado', 404);
  }

  const vid = body.value_id || null;
  const newAttribute = {
    id: body.attribute_id,
    name: attrDef.name,
    value_id: vid,
    value_name: valueName,
    values: [{ id: vid, name: valueName }],
  };

  let currentAttributes = (product.attributes || []).filter(
    (attr: any) => attr.id !== body.attribute_id
  );
  currentAttributes.push(newAttribute);

  const { data, error } = await supabase
    .from('products')
    .update({
      attributes: currentAttributes,
      enriched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;

  return jsonResponse({ success: true, data });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: POST /products/:id/variations
// ═══════════════════════════════════════════════════════════════════════════════
async function handleAddVariation(supabase: any, req: Request, productId: string) {
  const body = await req.json();

  if (!body.sku) return errorResponse('sku é obrigatório');
  if (!body.attributes || typeof body.attributes !== 'object') {
    return errorResponse('attributes é obrigatório e deve ser um objeto');
  }
  if (body.stock === undefined || body.stock < 0) {
    return errorResponse('stock é obrigatório e deve ser >= 0');
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('variations, price')
    .eq('id', productId)
    .single();

  if (productError || !product) {
    return errorResponse('Produto não encontrado', 404);
  }

  const currentVariations = product.variations || [];
  if (currentVariations.some((v: any) => v.sku === body.sku)) {
    return jsonResponse({ error: `Variação com SKU ${body.sku} já existe` }, 409);
  }

  const newVariation = {
    sku: body.sku,
    attributes: body.attributes,
    stock: body.stock,
    price: body.price || product.price,
    gtin: body.gtin || null,
    images: body.images || [],
  };

  currentVariations.push(newVariation);

  const { data, error } = await supabase
    .from('products')
    .update({
      variations: currentVariations,
      has_variations: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;

  return jsonResponse({ success: true, data, variation: newVariation }, 201);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: PUT /products/:id/variations/:sku
// ═══════════════════════════════════════════════════════════════════════════════
async function handleUpdateVariation(supabase: any, req: Request, productId: string, sku: string) {
  const body = await req.json();

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('variations')
    .eq('id', productId)
    .single();

  if (productError || !product) return errorResponse('Produto não encontrado', 404);

  const variations = product.variations || [];
  const idx = variations.findIndex((v: any) => v.sku === sku);
  if (idx === -1) return errorResponse('Variação não encontrada', 404);

  variations[idx] = { ...variations[idx], ...body, sku };

  const { data, error } = await supabase
    .from('products')
    .update({ variations, updated_at: new Date().toISOString() })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;

  return jsonResponse({ success: true, data });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: DELETE /products/:id/variations/:sku
// ═══════════════════════════════════════════════════════════════════════════════
async function handleDeleteVariation(supabase: any, productId: string, sku: string) {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('variations')
    .eq('id', productId)
    .single();

  if (productError || !product) return errorResponse('Produto não encontrado', 404);

  const original = product.variations || [];
  const filtered = original.filter((v: any) => v.sku !== sku);

  if (filtered.length === original.length) {
    return errorResponse('Variação não encontrada', 404);
  }

  const { data, error } = await supabase
    .from('products')
    .update({
      variations: filtered,
      has_variations: filtered.length > 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) throw error;

  return jsonResponse({ success: true, message: 'Variação removida', data });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: POST /products/:id/approve
// ═══════════════════════════════════════════════════════════════════════════════
async function handleApprove(supabase: any, productId: string, userId: string) {
  const { data, error } = await supabase
    .from('products')
    .update({
      approval_status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return errorResponse('Produto não encontrado', 404);
    throw error;
  }

  return jsonResponse({ success: true, data });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Handler: POST /products/:id/reject
// ═══════════════════════════════════════════════════════════════════════════════
async function handleReject(supabase: any, req: Request, productId: string) {
  const body = await req.json();

  const { data, error } = await supabase
    .from('products')
    .update({
      approval_status: 'rejected',
      rejected_at: new Date().toISOString(),
      rejection_reason: body.reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return errorResponse('Produto não encontrado', 404);
    throw error;
  }

  return jsonResponse({ success: true, data });
}
