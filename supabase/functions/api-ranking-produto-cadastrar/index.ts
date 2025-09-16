import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get API key from headers
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      console.error('Missing API key');
      return new Response(
        JSON.stringify({ success: false, error: 'API key é obrigatória' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API key and check permissions
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, permissions, active')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData || !keyData.active) {
      console.error('Invalid API key:', keyError?.message || 'Key not found or inactive');
      return new Response(
        JSON.stringify({ success: false, error: 'API key inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if API key has ranking.write permission
    const permissions = keyData.permissions as any;
    if (!permissions?.ranking?.write) {
      console.error('API key lacks ranking.write permission');
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão insuficiente para gravar dados de ranking' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update API key last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    // Parse request body
    const body = await req.json();
    const { posicao, sku, media_de_venda, media_de_lucro, "vendas.dia": vendas_dia } = body;

    // Validate required fields
    if (!posicao || !sku || media_de_venda === undefined || media_de_lucro === undefined || vendas_dia === undefined) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Campos obrigatórios: posicao, sku, media_de_venda, media_de_lucro, vendas.dia' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find product by SKU
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name')
      .eq('sku', sku)
      .eq('active', true)
      .single();

    if (productError || !product) {
      console.error('Product not found for SKU:', sku, productError?.message);
      return new Response(
        JSON.stringify({ success: false, error: `Produto não encontrado para SKU: ${sku}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert or update ranking data
    const rankingData = {
      product_id: product.id,
      sku: sku,
      position: parseInt(posicao),
      average_sales_value: parseFloat(media_de_venda),
      average_profit: parseFloat(media_de_lucro),
      daily_sales: parseFloat(vendas_dia),
      updated_at: new Date().toISOString()
    };

    const { data: rankingResult, error: rankingError } = await supabase
      .from('product_ranking')
      .upsert(rankingData, { 
        onConflict: 'sku',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (rankingError) {
      console.error('Error inserting ranking data:', rankingError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao salvar dados de ranking: ' + rankingError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Ranking data saved successfully:', rankingResult);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: rankingResult.id,
          produto_id: rankingResult.product_id,
          produto_nome: product.name,
          sku: rankingResult.sku,
          posicao: rankingResult.position,
          media_de_venda: rankingResult.average_sales_value,
          media_de_lucro: rankingResult.average_profit,
          vendas_dia: rankingResult.daily_sales,
          atualizado_em: rankingResult.updated_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});