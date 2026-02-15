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

    if (req.method !== 'PUT') {
      statusCode = 405;
      errorMessage = 'Method not allowed';
      return new Response(
        JSON.stringify({ error: 'Use PUT method' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { product_id, attribute_id, value, value_id } = body;

    if (!product_id) {
      statusCode = 400;
      errorMessage = 'product_id required';
      return new Response(
        JSON.stringify({ error: 'product_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!attribute_id) {
      statusCode = 400;
      errorMessage = 'attribute_id required';
      return new Response(
        JSON.stringify({ error: 'attribute_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (value === undefined || value === null) {
      statusCode = 400;
      errorMessage = 'value required';
      return new Response(
        JSON.stringify({ error: 'value é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar definição do atributo
    const { data: attrDef, error: attrError } = await supabase
      .from('attribute_definitions')
      .select('*')
      .eq('id', attribute_id)
      .single();

    if (attrError || !attrDef) {
      statusCode = 404;
      errorMessage = `Atributo ${attribute_id} não encontrado`;
      return new Response(
        JSON.stringify({ error: `Atributo ${attribute_id} não encontrado` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar produto atual
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('attributes')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      statusCode = 404;
      errorMessage = 'Produto não encontrado';
      return new Response(
        JSON.stringify({ error: 'Produto não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar novo atributo
    const newAttribute = {
      id: attribute_id,
      name: attrDef.name,
      value: value,
      value_id: value_id || null
    };

    // Remover existente e adicionar novo
    let currentAttributes = product.attributes || [];
    currentAttributes = currentAttributes.filter((attr: any) => attr.id !== attribute_id);
    currentAttributes.push(newAttribute);

    // Atualizar produto
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({
        attributes: currentAttributes,
        enriched_at: new Date().toISOString()
      })
      .eq('id', product_id)
      .select()
      .single();

    if (updateError) {
      statusCode = 500;
      errorMessage = updateError.message;
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar atributo', details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Atributo ${attribute_id} atualizado com sucesso`,
        data: {
          id: updatedProduct.id,
          nome: updatedProduct.name,
          atributos: updatedProduct.attributes,
          enriquecido_em: updatedProduct.enriched_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-produtos-atributos:', error);
    statusCode = 500;
    errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } finally {
    logApiRequest(supabase, {
      function_name: 'api-produtos-atributos',
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
