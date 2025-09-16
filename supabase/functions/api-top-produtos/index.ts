import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

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
    if (!permissions?.ranking?.read) {
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

    // Parse query parameters
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
    const period = url.searchParams.get('period') || '7d';

    // Calculate date filter based on period
    let dateFilter = new Date();
    switch (period) {
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    // Query for top products from demo data
    const { data: topProducts, error: productsError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        image_url,
        main_image_url,
        cost_price,
        price,
        demo_order_items!inner(
          quantity,
          unit_price,
          demo_orders!inner(
            status,
            created_at
          )
        )
      `)
      .eq('demo_order_items.demo_orders.status', 'confirmed')
      .gte('demo_order_items.demo_orders.created_at', dateFilter.toISOString())
      .eq('active', true);

    if (productsError) {
      console.error('Error fetching top products:', productsError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar top produtos',
          details: productsError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process and aggregate the data
    const productMap = new Map();

    topProducts?.forEach(product => {
      const productId = product.id;
      if (!productMap.has(productId)) {
        productMap.set(productId, {
          id: product.id,
          name: product.name,
          image_url: product.image_url || product.main_image_url,
          main_image_url: product.main_image_url,
          cost_price: product.cost_price || 0,
          price: product.price,
          total_sales: 0,
          total_revenue: 0,
          order_count: 0,
          days_with_sales: new Set()
        });
      }

      const productData = productMap.get(productId);
      product.demo_order_items.forEach((item: any) => {
        productData.total_sales += item.quantity;
        productData.total_revenue += item.quantity * item.unit_price;
        productData.order_count += 1;
        
        // Track unique days with sales
        const orderDate = new Date(item.demo_orders.created_at).toDateString();
        productData.days_with_sales.add(orderDate);
      });
    });

    // Convert to array and calculate metrics
    const processedProducts = Array.from(productMap.values()).map(product => {
      const avgPrice = product.total_revenue / product.total_sales || 0;
      const avgProfit = avgPrice - product.cost_price;
      
      return {
        id: product.id,
        nome: product.name,
        imagem: product.image_url,
        imagem_principal: product.main_image_url,
        preco_custo: product.cost_price,
        preco: product.price,
        vendas_totais: product.total_sales,
        preco_medio: Number(avgPrice.toFixed(2)),
        lucro_medio: Number(avgProfit.toFixed(2)),
        dias_com_vendas: product.days_with_sales.size
      };
    });

    // Sort by total sales and get top products
    const topSelling = processedProducts
      .sort((a, b) => b.vendas_totais - a.vendas_totais)
      .slice(0, limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: topSelling,
        period: period,
        total_products: topSelling.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-top-produtos:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});