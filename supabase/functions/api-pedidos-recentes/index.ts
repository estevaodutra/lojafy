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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '15'), 100);
    const status = url.searchParams.get('status');

    // Build the query
    let query = supabase
      .from('demo_orders')
      .select(`
        id,
        order_number,
        created_at,
        status,
        total_amount,
        demo_users!inner(
          id,
          first_name,
          last_name
        ),
        demo_order_items!inner(
          quantity,
          unit_price,
          total_price,
          products!inner(
            id,
            name,
            image_url,
            main_image_url,
            cost_price
          )
        )
      `);

    // Apply status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    // Apply ordering and limit
    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error('Error fetching recent orders:', ordersError);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao buscar pedidos recentes',
          details: ordersError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process the orders data
    const processedOrders = orders?.flatMap(order => {
      return order.demo_order_items.map((item: any) => {
        const costPrice = item.products.cost_price || 0;
        const profit = (item.unit_price - costPrice) * item.quantity;
        
        return {
          id: `${order.id}-${item.products.id}`,
          numero_pedido: order.order_number,
          data_criacao: order.created_at,
          status: order.status,
          valor_total: order.total_amount,
          nome_cliente: `${(order.demo_users as any)?.first_name || ''} ${(order.demo_users as any)?.last_name || ''}`.trim(),
          nome_produto: item.products.name,
          imagem_produto: item.products.image_url || item.products.main_image_url,
          preco_unitario: item.unit_price,
          quantidade: item.quantity,
          lucro: Number(profit.toFixed(2))
        };
      });
    }) || [];

    // Sort by creation date (most recent first)
    const sortedOrders = processedOrders
      .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime())
      .slice(0, limit);

    return new Response(
      JSON.stringify({
        success: true,
        data: sortedOrders,
        total: sortedOrders.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-pedidos-recentes:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});