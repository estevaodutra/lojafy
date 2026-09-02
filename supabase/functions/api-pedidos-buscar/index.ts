import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

function formatCPF(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11) return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (cleaned.length === 10) return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return phone;
}

function calculatePriceBreakdown(salePrice: number, costPrice: number, isEstimated: boolean) {
  const transactionPercent = 4.5;
  const contingencyPercent = 1.0;
  const transactionAmount = salePrice * (transactionPercent / 100);
  const afterTransaction = salePrice - transactionAmount;
  const contingencyAmount = afterTransaction * (contingencyPercent / 100);
  const afterContingency = afterTransaction - contingencyAmount;
  const afterCost = afterContingency - costPrice;
  const profit = afterCost;
  const profitMargin = salePrice > 0 ? (profit / salePrice) * 100 : 0;
  return {
    cost_price: Number(costPrice.toFixed(2)),
    is_estimated: isEstimated,
    sale_price: Number(salePrice.toFixed(2)),
    transaction_fee: { percentage: transactionPercent, amount: Number(transactionAmount.toFixed(2)), remaining: Number(afterTransaction.toFixed(2)) },
    contingency_fee: { percentage: contingencyPercent, amount: Number(contingencyAmount.toFixed(2)), remaining: Number(afterContingency.toFixed(2)) },
    after_cost: Number(afterCost.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    profit_margin: Number(profitMargin.toFixed(2)),
  };
}

function calculateFinancialSummary(items: any[], shippingAmount: number, taxAmount: number, totalRevenue: number) {
  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const totalCost = items.reduce((sum, item) => sum + (item.price_breakdown.cost_price * item.quantity), 0);
  const transactionPercent = 4.5;
  const transactionAmount = subtotal * (transactionPercent / 100);
  const afterTransaction = subtotal - transactionAmount;
  const contingencyPercent = 1.0;
  const contingencyAmount = afterTransaction * (contingencyPercent / 100);
  const afterContingency = afterTransaction - contingencyAmount;
  const netProfit = afterContingency - totalCost;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  return {
    subtotal: Number(subtotal.toFixed(2)),
    shipping_amount: Number(shippingAmount.toFixed(2)),
    tax_amount: Number(taxAmount.toFixed(2)),
    total_revenue: Number(totalRevenue.toFixed(2)),
    transaction_fee: { percentage: transactionPercent, amount: Number(transactionAmount.toFixed(2)), remaining: Number(afterTransaction.toFixed(2)) },
    contingency_fee: { percentage: contingencyPercent, amount: Number(contingencyAmount.toFixed(2)), remaining: Number(afterContingency.toFixed(2)) },
    total_cost: Number(totalCost.toFixed(2)),
    net_profit: Number(netProfit.toFixed(2)),
    profit_margin: Number(profitMargin.toFixed(2)),
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('X-API-Key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key é obrigatória. Use o header X-API-Key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key inválida ou inativa' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const permissions = apiKeyData.permissions || {};
    const hasPermission = permissions.pedidos?.read || permissions.orders?.read;
    if (!hasPermission) {
      return new Response(
        JSON.stringify({ success: false, error: 'Esta API Key não possui permissão de leitura de pedidos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase.from('api_keys').update({ last_used: new Date().toISOString() }).eq('id', apiKeyData.id);

    const url = new URL(req.url);
    const orderNumber = url.searchParams.get('order_number');
    const id = url.searchParams.get('id');
    const externalReference = url.searchParams.get('external_reference');
    const paymentId = url.searchParams.get('payment_id');

    if (!orderNumber && !id && !externalReference && !paymentId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Forneça pelo menos um identificador: order_number, id, external_reference ou payment_id',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id, product_id, quantity, unit_price, total_price, product_snapshot
        )
      `);

    if (id) query = query.eq('id', id);
    else if (orderNumber) query = query.eq('order_number', orderNumber);
    else if (externalReference) query = query.eq('external_reference', externalReference);
    else if (paymentId) query = query.eq('payment_id', paymentId);

    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError) {
      console.error('[api-pedidos-buscar] Query error:', orderError);
      throw orderError;
    }

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, cpf, phone')
      .eq('user_id', order.user_id)
      .maybeSingle();

    const productIds = [...new Set((order.order_items || []).map((i: any) => i.product_id))];
    const { data: products } = await supabase
      .from('products')
      .select('id, name, sku, brand, image_url, cost_price')
      .in('id', productIds);
    const productsMap = new Map((products || []).map((p: any) => [p.id, p]));

    const enrichedItems = (order.order_items || []).map((item: any) => {
      const snapshot = item.product_snapshot || {};
      const product = productsMap.get(item.product_id);
      let costPrice = snapshot.cost_price || 0;
      let isEstimated = false;
      if (!costPrice && product) {
        costPrice = product.cost_price || 0;
        isEstimated = true;
      }
      const breakdown = calculatePriceBreakdown(item.unit_price, costPrice, isEstimated);
      return {
        id: item.id,
        product_id: item.product_id,
        product_name: snapshot.name || product?.name || 'Produto',
        product_sku: snapshot.sku || product?.sku || '',
        product_brand: snapshot.brand || product?.brand || '',
        product_image: snapshot.image_url || product?.image_url || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        price_breakdown: breakdown,
      };
    });

    const financialSummary = calculateFinancialSummary(
      enrichedItems,
      order.shipping_amount || 0,
      order.tax_amount || 0,
      order.total_amount
    );

    const statusEnvioLabel = {
      pendente: 'Pedido Gerado > Aguardando Pagamento',
      pago: 'Pedido Pago > Aguardando Recebimento da Expedição',
      recebido: 'Pedido Recebido > Aguardando Envio',
      embalado: 'Embalado > Aguardando Envio',
      enviado: 'Pedido Enviado',
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
      etiqueta_incorreta: 'Erro | Etiqueta Incorreta',
    }[order.status as string] || order.status;

    const responseData = {
      id: order.id,
      order_number: order.order_number,
      status: order.status,
      shipping_status: order.status,
      shipping_status_label: statusEnvioLabel,
      status_envio: order.status,
      status_envio_label: statusEnvioLabel,
      payment_status: order.payment_status,
      payment_method: order.payment_method,
      payment_id: order.payment_id,
      external_reference: order.external_reference,
      total_amount: order.total_amount,
      shipping_amount: order.shipping_amount || 0,
      tax_amount: order.tax_amount || 0,
      created_at: order.created_at,
      updated_at: order.updated_at,
      tracking_number: order.tracking_number,
      shipping_method_name: order.shipping_method_name,
      shipping_estimated_days: order.shipping_estimated_days,
      has_shipping_file: order.has_shipping_file,
      customer: {
        user_id: order.user_id,
        first_name: profile?.first_name || '',
        last_name: profile?.last_name || '',
        full_name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        cpf: formatCPF(profile?.cpf || ''),
        phone: formatPhone(profile?.phone || ''),
      },
      shipping_address: order.shipping_address,
      billing_address: order.billing_address,
      items: enrichedItems,
      financial_summary: financialSummary,
      notes: order.notes,
    };

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[api-pedidos-buscar] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
