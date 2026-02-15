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

    const permissions = apiKeyData.permissions as any;
    if (!permissions?.produtos?.write) {
      statusCode = 403;
      errorMessage = 'Insufficient permissions';
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions for this endpoint' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('api_keys').update({ last_used: new Date().toISOString() }).eq('api_key', apiKey);

    const productId = url.searchParams.get('product_id');
    if (!productId) {
      statusCode = 400;
      errorMessage = 'product_id required';
      return new Response(
        JSON.stringify({ error: 'product_id é obrigatório (query param)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST - Adicionar variação
    if (req.method === 'POST') {
      const body = await req.json();
      const { sku, attributes, stock, price, gtin, images } = body;

      if (!sku) {
        statusCode = 400;
        errorMessage = 'sku required';
        return new Response(
          JSON.stringify({ error: 'sku é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!attributes || typeof attributes !== 'object') {
        statusCode = 400;
        errorMessage = 'attributes required';
        return new Response(
          JSON.stringify({ error: 'attributes é obrigatório e deve ser um objeto' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (stock === undefined || stock < 0) {
        statusCode = 400;
        errorMessage = 'stock required';
        return new Response(
          JSON.stringify({ error: 'stock é obrigatório e deve ser >= 0' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar produto
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('variations, price')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        statusCode = 404;
        errorMessage = 'Produto não encontrado';
        return new Response(
          JSON.stringify({ error: 'Produto não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const newVariation = {
        sku,
        attributes,
        stock,
        price: price || product.price,
        gtin: gtin || null,
        images: images || []
      };

      let currentVariations = product.variations || [];
      currentVariations = currentVariations.filter((v: any) => v.sku !== sku);
      currentVariations.push(newVariation);

      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          variations: currentVariations,
          has_variations: true,
          enriched_at: new Date().toISOString()
        })
        .eq('id', productId)
        .select()
        .single();

      if (updateError) {
        statusCode = 500;
        errorMessage = updateError.message;
        return new Response(
          JSON.stringify({ error: 'Erro ao adicionar variação', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      statusCode = 201;
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Variação adicionada com sucesso',
          data: {
            id: updatedProduct.id,
            nome: updatedProduct.name,
            variacoes: updatedProduct.variations,
            tem_variacoes: updatedProduct.has_variations
          },
          variacao: newVariation
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE - Remover variação
    if (req.method === 'DELETE') {
      const variationSku = url.searchParams.get('sku');
      if (!variationSku) {
        statusCode = 400;
        errorMessage = 'sku required';
        return new Response(
          JSON.stringify({ error: 'sku é obrigatório (query param)' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('variations')
        .eq('id', productId)
        .single();

      if (productError || !product) {
        statusCode = 404;
        errorMessage = 'Produto não encontrado';
        return new Response(
          JSON.stringify({ error: 'Produto não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let currentVariations = product.variations || [];
      const originalLength = currentVariations.length;
      currentVariations = currentVariations.filter((v: any) => v.sku !== variationSku);

      if (currentVariations.length === originalLength) {
        statusCode = 404;
        errorMessage = 'Variação não encontrada';
        return new Response(
          JSON.stringify({ error: 'Variação não encontrada' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          variations: currentVariations,
          has_variations: currentVariations.length > 0
        })
        .eq('id', productId)
        .select()
        .single();

      if (updateError) {
        statusCode = 500;
        errorMessage = updateError.message;
        return new Response(
          JSON.stringify({ error: 'Erro ao remover variação', details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Variação removida com sucesso',
          data: {
            id: updatedProduct.id,
            nome: updatedProduct.name,
            variacoes: updatedProduct.variations,
            tem_variacoes: updatedProduct.has_variations
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    statusCode = 405;
    errorMessage = 'Method not allowed';
    return new Response(
      JSON.stringify({ error: 'Use POST (adicionar) ou DELETE (remover) method' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-produtos-variacoes:', error);
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    logApiRequest(supabase, {
      function_name: 'api-produtos-variacoes',
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
