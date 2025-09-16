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
    if (!permissions?.ranking?.write) {
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

    const requestBody = await req.json();
    const {
      demo_user_id,
      items, // Array of { product_id, quantity, unit_price }
      status = 'confirmed',
      shipping_amount = 0,
      tax_amount = 0
    } = requestBody;

    // Validate required fields
    if (!demo_user_id || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Campos obrigatórios: demo_user_id, items (array com product_id, quantity, unit_price)'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate demo_user_id exists
    const { data: demoUser, error: userError } = await supabase
      .from('demo_users')
      .select('id')
      .eq('id', demo_user_id)
      .maybeSingle();

    if (userError || !demoUser) {
      return new Response(
        JSON.stringify({ error: 'Demo user not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate all products exist
    const productIds = items.map((item: any) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, name')
      .in('id', productIds)
      .eq('active', true);

    if (productsError || !products || products.length !== productIds.length) {
      return new Response(
        JSON.stringify({ error: 'One or more products not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate total amount
    const totalItemsAmount = items.reduce((sum: number, item: any) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    
    const totalAmount = totalItemsAmount + shipping_amount + tax_amount;

    // Generate order number
    const orderNumber = `DEMO-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Create demo order
    const { data: newOrder, error: orderError } = await supabase
      .from('demo_orders')
      .insert({
        demo_user_id,
        order_number: orderNumber,
        status,
        total_amount: totalAmount,
        shipping_amount,
        tax_amount,
        demo_type: 'ranking'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating demo order:', orderError);
      return new Response(
        JSON.stringify({
          error: 'Erro ao criar pedido demo',
          details: orderError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create order items
    const orderItems = items.map((item: any) => ({
      demo_order_id: newOrder.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.quantity * item.unit_price
    }));

    const { error: itemsError } = await supabase
      .from('demo_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating demo order items:', itemsError);
      
      // Rollback: delete the created order
      await supabase
        .from('demo_orders')
        .delete()
        .eq('id', newOrder.id);

      return new Response(
        JSON.stringify({
          error: 'Erro ao criar itens do pedido demo',
          details: itemsError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          id: newOrder.id,
          numero_pedido: newOrder.order_number,
          demo_user_id: newOrder.demo_user_id,
          status: newOrder.status,
          valor_total: newOrder.total_amount,
          valor_frete: newOrder.shipping_amount,
          valor_impostos: newOrder.tax_amount,
          data_criacao: newOrder.created_at,
          items: orderItems.length
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in api-demo-pedidos-cadastrar:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});