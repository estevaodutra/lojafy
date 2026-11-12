import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function formatCpf(cpf: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return `${cleaned.substring(0, 3)}.***.***-${cleaned.substring(9)}`;
  }
  return cpf;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let orderIdentifier = '';

    if (req.method === 'GET') {
      const url = new URL(req.url);
      orderIdentifier = url.searchParams.get('id') || url.searchParams.get('order_id') || url.searchParams.get('order_number') || '';
    } else {
      const body = await req.json().catch(() => ({}));
      orderIdentifier = body.order_id || body.id || body.order_number || '';
    }

    if (!orderIdentifier) {
      return new Response(
        JSON.stringify({ error: 'Identificador do pedido (id ou order_number) é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar pedido completo (usando service role key - seguro para anon publico pois sanitizamos a saida)
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        payment_status,
        payment_method,
        payment_id,
        external_reference,
        tracking_number,
        has_shipping_file,
        tax_amount,
        total_amount,
        created_at,
        payment_expires_at,
        pix_qr_code,
        pix_qr_code_base64,
        shipping_address,
        user_id,
        reseller_id,
        notes,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          supplier_id,
          supplier_unit_cost,
          supplier_total_cost,
          product_snapshot
        )
      `);

    // Checar se e UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdentifier);
    if (isUuid) {
      query = query.eq('id', orderIdentifier);
    } else {
      query = query.eq('order_number', orderIdentifier);
    }

    const { data: order, error: orderError } = await query.maybeSingle();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Pedido não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitizar dados do cliente a partir de shipping_address ou profile
    const shippingAddr = (order.shipping_address as Record<string, any>) || {};
    let customerName = shippingAddr.name || shippingAddr.receiver_name || '';
    let customerCpf = shippingAddr.cpf || shippingAddr.document || '';

    if (!customerName && order.user_id) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name, cpf')
          .eq('user_id', order.user_id)
          .maybeSingle();
        if (profile) {
          customerName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Cliente';
          if (!customerCpf && profile.cpf) customerCpf = profile.cpf;
        }
      } catch {}
    }

    if (!customerName) customerName = 'Cliente';

    // Buscar imagens e preços do catálogo caso não estejam presentes no snapshot
    const productIds = ((order.order_items as any[]) || []).map((it) => it.product_id).filter(Boolean);
    const productMap = new Map<string, any>();
    if (productIds.length > 0) {
      try {
        const { data: dbProds } = await supabase
          .from('products')
          .select('id, image_url, main_image_url, price, cost_price, name, sku')
          .in('id', productIds);
        if (dbProds) {
          dbProds.forEach((p: any) => productMap.set(p.id, p));
        }
      } catch {}
    }

    // Se o pedido é de marketplace ou dropshipping, o valor a pagar pelo revendedor é o preço de custo na Lojafy (preço de revenda)
    const isMarketplaceOrder = !!order.ml_order_id || 
      order.payment_method === 'mercadolivre' || 
      (typeof order.notes === 'string' && (order.notes.includes('Mercado Livre') || order.notes.includes('Taxas ML'))) ||
      ((order.order_items as any[]) || []).some((it: any) => !!it.supplier_id || !!it.supplier_unit_cost);

    let totalPayableAmount = 0;

    // Itens sanitizados - Preço unitário e total ajustados ao custo da Lojafy se for marketplace
    const items = ((order.order_items as any[]) || []).map((it) => {
      const snap = it.product_snapshot || {};
      const prod = productMap.get(it.product_id);
      const img = snap.image_url || 
        (Array.isArray(snap.images) ? snap.images[0] : null) || 
        prod?.main_image_url || 
        prod?.image_url || 
        null;

      let unitPrice = Number(it.unit_price || 0);
      if (isMarketplaceOrder) {
        const resellerPrice = Number(prod?.price || snap?.price || snap?.reseller_price || 0);
        if (resellerPrice > 0) {
          unitPrice = resellerPrice;
        } else if (Number(prod?.cost_price || snap?.cost_price || it.supplier_unit_cost || 0) > 0) {
          unitPrice = Number(prod?.cost_price || snap?.cost_price || it.supplier_unit_cost);
        }
      }
      const totalPrice = Math.round(unitPrice * it.quantity * 100) / 100;
      totalPayableAmount += totalPrice;

      return {
        id: it.id,
        product_id: it.product_id,
        name: snap.name || snap.title || prod?.name || 'Produto',
        sku: snap.sku || prod?.sku || null,
        quantity: it.quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        image_url: img,
        product_url: `https://lojafy.app/produto/${it.product_id}`,
        catalog_url: `https://lojafy.app/catalogo/produto/${it.product_id}`,
      };
    });

    totalPayableAmount = Math.round(totalPayableAmount * 100) / 100;

    if (totalPayableAmount <= 0) {
      if (typeof order.notes === 'string') {
        const costMatch = order.notes.match(/Custo Lojafy:\s*R\$\s*([0-9.,]+)/i) || 
                          order.notes.match(/Custo:\s*R\$\s*([0-9.,]+)/i) ||
                          order.notes.match(/Pix 24h:\s*R\$\s*([0-9.,]+)/i);
        if (costMatch) {
          totalPayableAmount = parseFloat(costMatch[1].replace(',', '.'));
        }
      }
    }
    if (totalPayableAmount <= 0) {
      totalPayableAmount = Number(order.total_amount || 0);
    }

    const isPaid = order.payment_status === 'paid' || order.status === 'pago' || order.status === 'recebido' || order.status === 'enviado';

    // Verificar débito pendente na carteira do parceiro/revendedor (ou débito já quitado neste pedido)
    const targetUserId = order.reseller_id || order.user_id;
    let walletDebt = 0;
    if (targetUserId) {
      try {
        if (!isPaid) {
          const { data: userWallet } = await supabase
            .from('wallets')
            .select('saldo')
            .eq('user_id', targetUserId)
            .maybeSingle();
          if (userWallet && Number(userWallet.saldo) < 0) {
            walletDebt = Math.round(Math.abs(Number(userWallet.saldo)) * 100) / 100;
          }
        } else {
          const { data: settledTx } = await supabase
            .from('wallet_transactions')
            .select('valor')
            .eq('referencia_tipo', 'quitacao_debito_pedido')
            .eq('referencia_id', order.id)
            .maybeSingle();
          if (settledTx && Number(settledTx.valor) > 0) {
            walletDebt = Math.round(Number(settledTx.valor) * 100) / 100;
          }
        }
      } catch (wErr) {
        console.warn('[public-order-payment] Aviso ao consultar carteira:', wErr);
      }
    }

    const productCostAmount = totalPayableAmount;
    const totalPixPayable = Math.round((productCostAmount + walletDebt) * 100) / 100;

    let copyPaste = order.pix_qr_code || null;
    let base64 = order.pix_qr_code_base64 || null;

    // Verificar se o Pix existente corresponde ao valor devido (produto + eventual débito da carteira)
    if (!isPaid && (isMarketplaceOrder || walletDebt > 0) && totalPixPayable > 0) {
      const expectedAmountStr = totalPixPayable.toFixed(2);
      const expectedAmountTag = `54${String(expectedAmountStr.length).padStart(2, '0')}${expectedAmountStr}`;
      const isMismatched = copyPaste && !copyPaste.includes(expectedAmountTag);

      if (!copyPaste || isMismatched) {
        console.log(`[public-order-payment] Pix desatualizado ou divergente (esperado R$ ${expectedAmountStr}). Re-gerando...`);
        try {
          const { data: pixData } = await supabase.functions.invoke('ml-order-webhook', {
            body: { action: 'generate_pix_for_order', order_id: order.id, force_regenerate: true },
          });
          if (pixData?.pix_qr_code) {
            copyPaste = pixData.pix_qr_code;
            base64 = pixData.pix_qr_code_base64 || null;
          }
        } catch (pixErr) {
          console.error('[public-order-payment] Erro ao re-gerar Pix:', pixErr);
        }
      }
    }

    const qrImageUrl = copyPaste
      ? `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(copyPaste)}`
      : (base64 ? `data:image/png;base64,${base64}` : null);

    // Buscar nome do revendedor (seller)
    let sellerName = 'Revendedor';
    if (order.reseller_id) {
      try {
        const { data: resProfile } = await supabase
          .from('profiles')
          .select('business_name, first_name, last_name')
          .eq('user_id', order.reseller_id)
          .maybeSingle();
        if (resProfile) {
          sellerName = resProfile.business_name || [resProfile.first_name, resProfile.last_name].filter(Boolean).join(' ') || 'Revendedor';
        }
      } catch {}
    }

    // Métricas financeiras da venda
    const saleAmount = Number(order.total_amount || 0);
    let marketplaceFee = Number(order.tax_amount || 0);

    if (marketplaceFee <= 0 && typeof order.notes === 'string') {
      const feeMatch = order.notes.match(/Taxas ML:\s*R\$\s*([0-9.,]+)/i) || order.notes.match(/Taxas:\s*R\$\s*([0-9.,]+)/i);
      if (feeMatch) {
        const parsed = parseFloat(feeMatch[1].replace(',', '.'));
        if (!isNaN(parsed) && parsed > 0) marketplaceFee = parsed;
      }
    }

    if (marketplaceFee <= 0 && isMarketplaceOrder && saleAmount > 0) {
      if (saleAmount < 79) {
        marketplaceFee = Math.round((6.00 + (saleAmount * 0.11)) * 100) / 100;
      } else {
        marketplaceFee = Math.round((saleAmount * 0.13) * 100) / 100;
      }
    }
    marketplaceFee = Math.round(marketplaceFee * 100) / 100;

    const sellerCost = totalPayableAmount; // R$ 6,90
    const sellerProfit = isMarketplaceOrder
      ? Math.max(0, Math.round((saleAmount - marketplaceFee - sellerCost) * 100) / 100)
      : Math.max(0, Math.round((saleAmount - sellerCost) * 100) / 100);

    const sellerMarginPct = saleAmount > 0 ? (sellerProfit / saleAmount) * 100 : 0;

    // Formatar tempo na etapa
    const diffMs = Date.now() - new Date(order.created_at).getTime();
    let timeInStageDisplay = "Recentemente";
    if (!isNaN(diffMs) && diffMs >= 0) {
      const minutes = Math.floor(diffMs / (1000 * 60));
      if (minutes < 60) {
        timeInStageDisplay = `Há ${Math.max(1, minutes)}m na etapa`;
      } else {
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
          timeInStageDisplay = `Há ${hours}h na etapa`;
        } else {
          const days = Math.floor(hours / 24);
          timeInStageDisplay = `Há ${days}d na etapa`;
        }
      }
    }

    const orderNumStr = String(order.order_number || '').replace(/^#/, '');

    const mlMatch = typeof order.notes === 'string' ? order.notes.match(/Mercado Livre #([0-9]+)/i) : null;
    const mlOrderId = order.ml_order_id || (mlMatch ? mlMatch[1] : null);
    const trackingNumber = order.tracking_number || null;
    const externalRef = order.external_reference || order.payment_id || (mlOrderId ? `m1_pay_${orderNumStr}` : null);
    const isMl = isMarketplaceOrder || !!mlOrderId || order.payment_method === 'mercadolivre';
    const channel = isMl ? 'mercadolivre' : (order.payment_method || 'lojafy');
    const channelLabel = isMl ? 'ML' : 'LOJAFY';
    const originType = (mlOrderId || externalRef) ? 'AUTO' : 'MANUAL';

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          order_number: orderNumStr,
          status: order.status,
          payment_status: isPaid ? 'paid' : (order.payment_status || 'pending'),
          payment_method: order.payment_method || 'pix',
          total_amount: (isMarketplaceOrder || walletDebt > 0) ? totalPixPayable : order.total_amount,
          retail_sale_amount: saleAmount,
          sale_amount: saleAmount,
          marketplace_fee: marketplaceFee,
          seller_cost: sellerCost,
          wallet_debt: walletDebt,
          total_payable_with_debt: totalPixPayable,
          seller_profit: sellerProfit,
          seller_margin_pct: sellerMarginPct,
          is_marketplace: isMarketplaceOrder,
          ml_order_id: mlOrderId,
          external_reference: externalRef,
          channel: channel,
          channel_label: channelLabel,
          origin_type: originType,
          tracking_number: trackingNumber,
          has_shipping_label: !!order.has_shipping_file,
          shipping_label_status: order.has_shipping_file ? 'ready' : 'pending',
          seller_name: sellerName,
          time_in_stage_display: timeInStageDisplay,
          created_at: order.created_at,
          payment_expires_at: order.payment_expires_at || null,
          customer: {
            name: customerName,
            cpf_masked: formatCpf(customerCpf),
            city: shippingAddr.city || null,
            state: shippingAddr.state || null,
            neighborhood: shippingAddr.neighborhood || null,
          },
          items,
          pix: {
            copy_paste_code: copyPaste,
            qr_code_base64: base64,
            qr_code_image_url: qrImageUrl,
            expires_at: order.payment_expires_at || null,
          },
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[public-order-payment] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro interno ao consultar pagamento' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
