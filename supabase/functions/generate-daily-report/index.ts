import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Determinar data do relatório (ontem ou data específica via query param)
    const url = new URL(req.url);
    const targetDateParam = url.searchParams.get('date'); // Formato: YYYY-MM-DD
    
    const reportDate = targetDateParam 
      ? new Date(targetDateParam) 
      : new Date(Date.now() - 24 * 60 * 60 * 1000); // Ontem

    reportDate.setHours(0, 0, 0, 0); // Início do dia
    const startOfDay = reportDate.toISOString();
    const endOfDay = new Date(reportDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

    console.log(`[REPORT] Generating report for ${reportDate.toISOString().split('T')[0]}`);

    // 1. Buscar pedidos PAGOS do dia
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('id, order_number, status, total_amount, shipping_amount, tax_amount')
      .gte('created_at', startOfDay)
      .lt('created_at', endOfDay)
      .eq('payment_status', 'paid'); // ⚠️ APENAS PEDIDOS PAGOS

    if (ordersError) {
      console.error('[REPORT ERROR] Failed to fetch orders:', ordersError);
      throw ordersError;
    }

    if (!orders || orders.length === 0) {
      console.log('[REPORT] No paid orders found for this date');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No paid orders to process',
          report_date: reportDate.toISOString().split('T')[0]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[REPORT] Found ${orders.length} paid orders`);

    const orderIds = orders.map(o => o.id);

    // 2. Buscar itens dos pedidos
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('order_id, product_id, quantity, unit_price, product_snapshot')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('[REPORT ERROR] Failed to fetch order items:', itemsError);
      throw itemsError;
    }

    console.log(`[REPORT] Found ${orderItems?.length || 0} order items`);

    // 3. Calcular métricas financeiras
    let totalCost = 0;
    let totalRevenue = 0;
    let totalItems = 0;
    let totalShipping = 0;
    let totalTaxes = 0;
    const ordersByStatus: Record<string, number> = {};
    const productSales: Record<string, { name: string; qty: number; revenue: number; cost: number }> = {};

    orders.forEach(order => {
      // Contabilizar status
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      
      // Somar frete e impostos
      totalShipping += Number(order.shipping_amount || 0);
      totalTaxes += Number(order.tax_amount || 0);
    });

    orderItems?.forEach(item => {
      const quantity = item.quantity;
      const unitPrice = Number(item.unit_price);
      
      // Extrair cost_price do snapshot
      const snapshot = item.product_snapshot as any;
      const costPrice = snapshot?.cost_price ? Number(snapshot.cost_price) : 0; // Se não houver custo, assume 0

      // Calcular totais
      const itemRevenue = unitPrice * quantity;
      const itemCost = costPrice * quantity;
      
      totalRevenue += itemRevenue;
      totalCost += itemCost;
      totalItems += quantity;

      // Rastrear produtos mais vendidos
      const productId = item.product_id;
      const productName = snapshot?.name || 'Produto sem nome';
      
      if (!productSales[productId]) {
        productSales[productId] = { name: productName, qty: 0, revenue: 0, cost: 0 };
      }
      productSales[productId].qty += quantity;
      productSales[productId].revenue += itemRevenue;
      productSales[productId].cost += itemCost;
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Top 10 produtos mais vendidos
    const topProducts = Object.entries(productSales)
      .map(([id, data]) => ({ 
        id, 
        name: data.name,
        qty: data.qty,
        revenue: data.revenue,
        cost: data.cost,
        profit: data.revenue - data.cost
      }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    console.log(`[REPORT] Calculated metrics:`, {
      orders: orders.length,
      items: totalItems,
      revenue: totalRevenue.toFixed(2),
      cost: totalCost.toFixed(2),
      profit: totalProfit.toFixed(2),
      margin: profitMargin.toFixed(2) + '%'
    });

    // 4. Inserir/Atualizar relatório no banco
    const reportData = {
      report_date: reportDate.toISOString().split('T')[0],
      total_orders: orders.length,
      total_items: totalItems,
      total_cost: totalCost.toFixed(2),
      total_revenue: totalRevenue.toFixed(2),
      total_profit: totalProfit.toFixed(2),
      profit_margin: profitMargin.toFixed(2),
      total_shipping: totalShipping.toFixed(2),
      total_taxes: totalTaxes.toFixed(2),
      orders_by_status: ordersByStatus,
      top_products: topProducts,
      generated_at: new Date().toISOString(),
    };

    const { data: report, error: reportError } = await supabase
      .from('daily_sales_reports')
      .upsert(reportData, { onConflict: 'report_date' })
      .select()
      .single();

    if (reportError) {
      console.error('[REPORT ERROR] Failed to save report:', reportError);
      throw reportError;
    }

    console.log('[REPORT] ✅ Report generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        report,
        summary: {
          date: reportData.report_date,
          orders: orders.length,
          revenue: `R$ ${totalRevenue.toFixed(2)}`,
          profit: `R$ ${totalProfit.toFixed(2)}`,
          margin: `${profitMargin.toFixed(2)}%`
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('[REPORT ERROR] Failed to generate report:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Check edge function logs for more information'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});