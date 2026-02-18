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
      anuncio_referencia,
      fornecedor_id,
      requer_aprovacao,
      // Novos campos de catálogo enriquecido
      atributos,
      variacoes,
      dominio_id,
      condicao,
      fonte_catalogo,
      fonte_catalogo_id
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
    let normalizedFornecedorId: string | null = null;
    
    try {
      normalizedCategoriaId = normalizeUuid(categoria_id);
      normalizedSubcategoriaId = normalizeUuid(subcategoria_id);
      normalizedFornecedorId = normalizeUuid(fornecedor_id);
    } catch (error) {
      console.error('[UUID_ERROR] Invalid UUID format:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Formato de UUID inválido',
          details: error instanceof Error ? error.message : String(error),
          received: { categoria_id, subcategoria_id, fornecedor_id }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar fornecedor_id se fornecido
    if (normalizedFornecedorId) {
      const { data: supplier, error: supplierError } = await supabase
        .from('profiles')
        .select('user_id, role, is_active')
        .eq('user_id', normalizedFornecedorId)
        .eq('role', 'supplier')
        .eq('is_active', true)
        .single();

      if (supplierError || !supplier) {
        return new Response(
          JSON.stringify({ 
            error: 'Fornecedor não encontrado, inativo ou não possui role de fornecedor',
            received: { fornecedor_id: normalizedFornecedorId }
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Validar que se requer_aprovacao=true, deve ter fornecedor_id
    if (requer_aprovacao && !normalizedFornecedorId) {
      return new Response(
        JSON.stringify({ 
          error: 'Campo fornecedor_id é obrigatório quando requer_aprovacao=true',
          received: { fornecedor_id: normalizedFornecedorId, requer_aprovacao }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar atributos se fornecido
    if (atributos !== undefined && !Array.isArray(atributos)) {
      return new Response(
        JSON.stringify({ error: 'atributos deve ser um array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar variações se fornecido
    if (variacoes !== undefined && !Array.isArray(variacoes)) {
      return new Response(
        JSON.stringify({ error: 'variacoes deve ser um array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar condição se fornecida
    const validConditions = ['new', 'used', 'refurbished', 'not_specified'];
    if (condicao && !validConditions.includes(condicao)) {
      return new Response(
        JSON.stringify({ error: `condicao deve ser: ${validConditions.join(', ')}` }),
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

    // Calcular campos automáticos
    const normalizedAtributos = atributos || [];
    const normalizedVariacoes = variacoes || [];
    const hasVariations = normalizedVariacoes.length > 0;

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
      supplier_id: normalizedFornecedorId,
      requires_approval: requer_aprovacao || false,
      approval_status: (normalizedFornecedorId && requer_aprovacao) ? 'pending_approval' : 'draft',
      created_by: apiKeyData.user_id,
      active: (normalizedFornecedorId && requer_aprovacao) ? false : true,
      // Novos campos de catálogo enriquecido
      attributes: normalizeAttributes(normalizedAtributos),
      variations: normalizedVariacoes,
      domain_id: dominio_id || null,
      condition: condicao || 'new',
      has_variations: hasVariations,
      catalog_source: fonte_catalogo || null,
      catalog_source_id: fonte_catalogo_id || null,
      enriched_at: normalizedAtributos.length > 0 ? new Date().toISOString() : null,
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

    // Notificar fornecedor quando produto é atribuído para aprovação
    if (normalizedFornecedorId && requer_aprovacao) {
      await supabase
        .from('notifications')
        .insert({
          user_id: normalizedFornecedorId,
          title: '📦 Novo Produto para Aprovação',
          message: `O produto "${product.name}" foi adicionado à sua conta e aguarda aprovação.`,
          type: 'product_approval_pending',
          action_url: '/supplier/produtos/aprovacao',
          action_label: 'Revisar Produto',
          metadata: {
            product_id: product.id,
            product_name: product.name
          }
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: (normalizedFornecedorId && requer_aprovacao) 
          ? 'Produto criado com sucesso e enviado para aprovação do fornecedor' 
          : 'Produto criado com sucesso',
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
          fornecedor_id: product.supplier_id,
          requer_aprovacao: product.requires_approval,
          status_aprovacao: product.approval_status,
          // Novos campos
          atributos: product.attributes,
          variacoes: product.variations,
          dominio_id: product.domain_id,
          condicao: product.condition,
          tem_variacoes: product.has_variations,
          fonte_catalogo: product.catalog_source,
          fonte_catalogo_id: product.catalog_source_id,
          enriquecido_em: product.enriched_at,
          criado_por: product.created_by,
          criado_em: product.created_at,
          atualizado_em: product.updated_at,
          ...(product.approval_status === 'pending_approval' && {
            mensagem: 'Produto aguardando aprovação do fornecedor'
          })
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