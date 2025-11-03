import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

// Helper function to validate and normalize UUID fields
function normalizeUuid(value: any): string | null {
  if (!value || value === "" || value === "null" || value === null || value === undefined) {
    return null;
  }
  
  const stringValue = String(value).trim();
  if (stringValue === "") return null;
  
  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(stringValue)) {
    throw new Error(`Invalid UUID format: ${stringValue}`);
  }
  
  return stringValue;
}

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
    if (!permissions?.produtos?.write) {
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

    // Parse request body
    const body = await req.json();
    const {
      nome,
      descricao: rawDescricao,
      preco,
      preco_promocional,
      preco_custo,
      estoque,
      nivel_minimo_estoque,
      alerta_estoque_baixo,
      sku,
      gtin,
      categoria_id,
      subcategoria_id,
      imagens = [],
      imagem_principal,
      marca,
      especificacoes = {},
      peso,
      largura,
      altura,
      comprimento,
      produto_destaque,
      badge,
      alta_rotatividade,
      anuncio_referencia
    } = body;

    // Normalize data
    const descricao = rawDescricao ? rawDescricao.replace(/\\r\\n/g, '\n').replace(/\r\n/g, '\n') : null;
    const normalizedPrecoPromocional = preco_promocional === "" || preco_promocional === undefined ? null : preco_promocional;
    const normalizedSku = sku === "" ? null : sku;
    const normalizedGtin = gtin === "" ? null : gtin;
    const normalizedMarca = marca === "" ? null : marca;
    const normalizedBadge = badge === "" ? null : badge;
    const normalizedAnuncioReferencia = anuncio_referencia === "" || anuncio_referencia === undefined ? null : anuncio_referencia;
    const normalizedImagemPrincipal = imagem_principal === "" || imagem_principal === "null" ? null : imagem_principal;
    const normalizedImagens = (imagens && imagens.length > 0) ? imagens.filter((img: string) => img && img !== "" && img !== "null") : [];
    const normalizedEspecificacoes = especificacoes && Object.keys(especificacoes).length > 0 ? especificacoes : {};

    // Normalize UUID fields with validation
    let normalizedCategoriaId: string | null = null;
    let normalizedSubcategoriaId: string | null = null;
    
    try {
      normalizedCategoriaId = normalizeUuid(categoria_id);
      normalizedSubcategoriaId = normalizeUuid(subcategoria_id);
    } catch (error) {
      console.error('[UUID_ERROR] Invalid UUID format:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Formato de UUID inválido',
          details: error instanceof Error ? error.message : String(error),
          received: { categoria_id, subcategoria_id }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate required fields
    if (!nome || !preco) {
      return new Response(
        JSON.stringify({ 
          error: 'Campos obrigatórios: nome, preco',
          received: { nome, preco }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate business rules
    if (normalizedPrecoPromocional && normalizedPrecoPromocional >= preco) {
      return new Response(
        JSON.stringify({ 
          error: 'Preço promocional deve ser menor que o preço regular',
          received: { preco, preco_promocional: normalizedPrecoPromocional }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (preco_custo && preco_custo >= preco) {
      return new Response(
        JSON.stringify({ 
          error: 'Preço de custo deve ser menor que o preço de venda',
          received: { preco, preco_custo }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate reference ad URL if provided
    if (normalizedAnuncioReferencia) {
      try {
        new URL(normalizedAnuncioReferencia);
      } catch {
        return new Response(
          JSON.stringify({ 
            error: 'anuncio_referencia deve ser uma URL válida',
            received: { anuncio_referencia: normalizedAnuncioReferencia }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validate subcategory belongs to category if both are provided
    if (normalizedSubcategoriaId && normalizedCategoriaId) {
      const { data: subcategory, error: subcategoryError } = await supabase
        .from('subcategories')
        .select('category_id')
        .eq('id', normalizedSubcategoriaId)
        .eq('active', true)
        .single();

      if (subcategoryError || subcategory?.category_id !== normalizedCategoriaId) {
        return new Response(
          JSON.stringify({ 
            error: 'Subcategoria não pertence à categoria especificada ou não existe',
            received: { categoria_id: normalizedCategoriaId, subcategoria_id: normalizedSubcategoriaId }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create product data
    const productData: any = {
      name: nome,
      description: descricao,
      price: preco,
      original_price: normalizedPrecoPromocional,
      cost_price: preco_custo,
      stock_quantity: estoque || 0,
      min_stock_level: nivel_minimo_estoque || 5,
      low_stock_alert: alerta_estoque_baixo || false,
      category_id: normalizedCategoriaId,
      subcategory_id: normalizedSubcategoriaId,
      images: normalizedImagens,
      main_image_url: normalizedImagemPrincipal,
      brand: normalizedMarca,
      specifications: normalizedEspecificacoes,
      weight: peso,
      width: largura,
      height: altura,
      length: comprimento,
      featured: normalizedAnuncioReferencia ? true : (produto_destaque || false),
      badge: normalizedBadge,
      high_rotation: alta_rotatividade || false,
      reference_ad_url: normalizedAnuncioReferencia,
      active: true
    };

    // Add SKU and GTIN if provided, otherwise they will be auto-generated by trigger
    if (normalizedSku && normalizedSku.trim()) {
      productData.sku = normalizedSku.trim();
    }
    if (normalizedGtin && normalizedGtin.trim()) {
      productData.gtin_ean13 = normalizedGtin.trim();
    }

    // Insert product
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

    if (productError) {
      console.error('[DB_ERROR] Error creating product:', productError);
      
      // Handle specific UUID error
      if (productError.code === '22P02' && productError.message.includes('invalid input syntax for type uuid')) {
        return new Response(
          JSON.stringify({ 
            error: 'Formato de UUID inválido nos campos categoria_id ou subcategoria_id',
            details: 'UUIDs devem ter o formato: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx ou ser nulos',
            received: { categoria_id: normalizedCategoriaId, subcategoria_id: normalizedSubcategoriaId }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar produto',
          details: productError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Produto criado com sucesso:', { 
      id: product.id, 
      name: product.name, 
      sku: product.sku 
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Produto criado com sucesso',
        data: {
          id: product.id,
          nome: product.name,
          descricao: product.description,
          sku: product.sku,
          gtin: product.gtin_ean13,
          preco: product.price,
          preco_promocional: product.original_price,
          preco_custo: product.cost_price,
          estoque: product.stock_quantity,
          nivel_minimo_estoque: product.min_stock_level,
          alerta_estoque_baixo: product.low_stock_alert,
          categoria_id: product.category_id,
          subcategoria_id: product.subcategory_id,
          marca: product.brand,
          produto_destaque: product.featured,
          badge: product.badge,
          alta_rotatividade: product.high_rotation,
          anuncio_referencia: product.reference_ad_url,
          imagens: product.images,
          imagem_principal: product.main_image_url,
          especificacoes: product.specifications,
          peso: product.weight,
          largura: product.width,
          altura: product.height,
          comprimento: product.length,
          ativo: product.active,
          criado_em: product.created_at,
          atualizado_em: product.updated_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-produtos-cadastrar:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});