import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { getPublicSignedUrl } from '../_shared/get-public-signed-url.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MP_ACCESS_TOKEN = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface MlUserToken {
  accessToken: string;
  resellerUserId: string;
}

/**
 * Busca token de acesso do Mercado Livre para o usuário ML e renova se estiver prestes a expirar.
 */
async function getTokenAndReseller(mlUserId: number): Promise<MlUserToken | null> {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('access_token, refresh_token, expires_at, user_id')
    .eq('ml_user_id', mlUserId)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  let accessToken = data.access_token;
  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

  // Se expira nos próximos 10 minutos, renova preventivamente
  if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
    try {
      const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
        body: { user_id: data.user_id },
      });
      if (refreshData?.access_token) {
        accessToken = refreshData.access_token;
      }
    } catch (err) {
      console.warn('[ml-order-webhook] Falha no refresh preventivo, usando token atual:', err);
    }
  }

  return {
    accessToken,
    resellerUserId: data.user_id,
  };
}

/**
 * Gera QR Code e Copia e Cola Pix com validade de 24 horas.
 * Tenta N8N primeiro; faz fallback para a API oficial do Mercado Pago se necessário.
 */
async function generatePix24h(params: {
  orderNumber: string;
  amount: number;
  description: string;
  resellerUserId: string;
  resellerProfile: any;
  resellerEmail: string | null;
  items: Array<{ productId: string | null; name: string; quantity: number; costPrice: number }>;
  mlOrderId: string;
  walletDeducted: number;
  totalCost: number;
}): Promise<{ qrCode: string | null; qrCodeBase64: string | null; paymentId: string | null; expiresAt: string }> {
  // 24 horas a partir de agora
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const externalReference = `ml_pay_${params.orderNumber}`;

  const n8nBaseUrl = Deno.env.get('N8N_WEBHOOK_BASE_URL') || 'https://n8n.d2x.site';
  const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || `${n8nBaseUrl}/webhook/generate_payments`;

  const n8nPayload = {
    pedido: {
      numero_pedido: params.orderNumber,
      external_reference: externalReference,
      timestamp: new Date().toISOString(),
      valor_total: Number(params.amount),
      descricao: params.description,
      quantidade_itens: params.items.reduce((acc, i) => acc + i.quantity, 0) || 1,
      expires_at: expiresAt,
      expiration_hours: 24,
    },
    cliente: {
      user_id: params.resellerUserId,
      nome_completo: `${params.resellerProfile?.first_name || ''} ${params.resellerProfile?.last_name || ''}`.trim() || 'Revendedor Lojafy',
      email: params.resellerEmail || 'revendedor@lojafy.app',
      telefone: params.resellerProfile?.phone || '',
      cpf: (params.resellerProfile?.cpf || '').replace(/\D/g, ''),
      endereco: null,
    },
    produtos: params.items.map((i) => ({
      id: i.productId || 'ml-item',
      nome: i.name,
      preco_unitario: i.costPrice,
      quantidade: i.quantity,
      valor_total_item: Math.round(i.costPrice * i.quantity * 100) / 100,
    })),
    pagamento: {
      metodo: 'pix',
      valor: Number(params.amount),
      date_of_expiration: expiresAt,
    },
    metadata: {
      platform: 'lojafy',
      source: 'mercadolivre_automatic_fulfillment',
      ml_order_id: params.mlOrderId,
      order_number: params.orderNumber,
      reseller_id: params.resellerUserId,
      total_cost: params.totalCost,
      wallet_deducted: params.walletDeducted,
      pix_amount: params.amount,
    },
  };

  let qrCode: string | null = null;
  let qrCodeBase64: string | null = null;
  let paymentId: string | null = null;

  // Tentativa 1: Webhook N8N
  try {
    console.log('[ml-order-webhook] Chamando N8N para gerar Pix (24h)...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const n8nRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (n8nRes.ok) {
      const responseData = await n8nRes.json();
      const pixData = Array.isArray(responseData) ? responseData[0] : responseData;
      const firstPayment = pixData?.transactions?.payments?.[0];

      qrCode = pixData?.qrCodeCopyPaste ?? pixData?.qr_code ?? firstPayment?.payment_method?.qr_code ?? null;
      qrCodeBase64 = pixData?.qrCodeBase64 ?? pixData?.qr_code_base64 ?? firstPayment?.payment_method?.qr_code_base64 ?? null;
      paymentId = pixData?.paymentId ? String(pixData.paymentId) : (firstPayment?.id ? String(firstPayment.id) : null);

      if (qrCode) {
        console.log('[ml-order-webhook] Pix gerado com sucesso via N8N:', paymentId);
      }
    } else {
      console.warn('[ml-order-webhook] N8N retornou status:', n8nRes.status);
    }
  } catch (err) {
    console.warn('[ml-order-webhook] Erro ao chamar N8N:', err);
  }

  // Tentativa 2: API direta do Mercado Pago (fallback robusto)
  if (!qrCode && MP_ACCESS_TOKEN) {
    try {
      console.log('[ml-order-webhook] Gerando Pix via API direta Mercado Pago com expiração 24h...');
      const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
          'X-Idempotency-Key': `ml_pix_${params.orderNumber}_${Date.now()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_amount: Number(params.amount),
          description: params.description,
          payment_method_id: 'pix',
          date_of_expiration: expiresAt,
          payer: {
            email: params.resellerEmail || 'revendedor@lojafy.app',
            first_name: params.resellerProfile?.first_name || 'Revendedor',
            last_name: params.resellerProfile?.last_name || 'Lojafy',
            identification: params.resellerProfile?.cpf ? {
              type: 'CPF',
              number: params.resellerProfile.cpf.replace(/\D/g, ''),
            } : undefined,
          },
          external_reference: externalReference,
          notification_url: `${SUPABASE_URL}/functions/v1/webhook-mercadopago`,
        }),
      });

      if (mpRes.ok) {
        const mpData = await mpRes.json();
        qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code ?? null;
        qrCodeBase64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64 ?? null;
        paymentId = mpData?.id ? String(mpData.id) : null;
        console.log('[ml-order-webhook] Pix gerado via Mercado Pago API:', paymentId);
      } else {
        const errText = await mpRes.text();
        console.error('[ml-order-webhook] Erro API Mercado Pago:', mpRes.status, errText);
      }
    } catch (mpErr) {
      console.error('[ml-order-webhook] Exceção Mercado Pago:', mpErr);
    }
  }

  return {
    qrCode,
    qrCodeBase64,
    paymentId: paymentId || `ml_pix_${params.orderNumber}`,
    expiresAt,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    console.log('[ml-order-webhook] Recebido payload:', JSON.stringify(body));

    const { topic, resource, user_id: mlUserId } = body;

    // Ping de teste do Mercado Livre
    if (!topic || !resource) {
      return new Response(JSON.stringify({ ok: true, message: 'Ping recebido' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apenas pedidos
    if (topic !== 'orders_v2' && topic !== 'orders') {
      console.log('[ml-order-webhook] Ignorando tópico:', topic);
      return new Response(JSON.stringify({ ok: true, ignored_topic: topic }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair ID do pedido: "/orders/123456"
    const orderIdMatch = resource.match(/\/orders\/(\d+)/);
    if (!orderIdMatch) {
      console.error('[ml-order-webhook] Impossível extrair ID do pedido de:', resource);
      return new Response(JSON.stringify({ error: 'Recurso inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const mlOrderId = orderIdMatch[1];
    const mlOrderIdStr = String(mlOrderId);

    // Idempotência: verificar se pedido já foi registrado
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status')
      .or(`payment_id.eq.ml_${mlOrderIdStr},ml_order_id.eq.${mlOrderIdStr}`)
      .maybeSingle();

    if (existingOrder) {
      console.log(`[ml-order-webhook] Pedido ML #${mlOrderIdStr} já existe: #${existingOrder.order_number}`);
      return new Response(JSON.stringify({ ok: true, already_processed: true, order_id: existingOrder.id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar token e revendedor
    const integrationInfo = await getTokenAndReseller(mlUserId);
    if (!integrationInfo) {
      console.error('[ml-order-webhook] Integração ML não encontrada para usuário ML:', mlUserId);
      return new Response(JSON.stringify({ error: 'Integração Mercado Livre não encontrada' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { accessToken, resellerUserId } = integrationInfo;

    // Buscar detalhes do pedido na API do Mercado Livre
    const orderRes = await fetch(`https://api.mercadolibre.com/orders/${mlOrderId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error('[ml-order-webhook] Falha ao buscar pedido no ML:', orderRes.status, errText);
      return new Response(JSON.stringify({ error: 'Falha ao buscar pedido no ML', details: errText }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const mlOrder = await orderRes.json();
    console.log(`[ml-order-webhook] Pedido ML #${mlOrderId} recuperado. Status ML:`, mlOrder.status);

    // Processar apenas pedidos pagos no Mercado Livre
    if (mlOrder.status !== 'paid') {
      console.log('[ml-order-webhook] Pedido ML ainda não está pago. Status:', mlOrder.status);
      return new Response(JSON.stringify({ ok: true, ml_status: mlOrder.status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extrair dados do comprador ML
    const buyer = mlOrder.buyer;
    const buyerName = `${buyer?.first_name ?? ''} ${buyer?.last_name ?? ''}`.trim() || 'Comprador Mercado Livre';
    const buyerEmail = buyer?.email ?? null;
    const buyerPhone = `${buyer?.phone?.area_code ?? ''} ${buyer?.phone?.number ?? ''}`.trim() || null;
    const buyerDoc = buyer?.billing_info?.doc_number ?? null;
    const receiverAddress = mlOrder.shipping?.receiver_address ?? null;
    const totalOrderAmount = Number(mlOrder.total_amount ?? 0);
    const orderItems = mlOrder.order_items ?? [];

    // Buscar perfil e email do revendedor
    const { data: resellerProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, cpf, phone')
      .eq('user_id', resellerUserId)
      .maybeSingle();

    const { data: resellerStore } = await supabase
      .from('reseller_stores')
      .select('store_name')
      .eq('user_id', resellerUserId)
      .maybeSingle();

    let resellerEmail: string | null = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(resellerUserId);
      resellerEmail = authUser?.user?.email ?? null;
    } catch {}

    // Identificar produtos catalogados e custos de fornecedor
    interface CompiledItem {
      productId: string | null;
      name: string;
      sku: string | null;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      totalCost: number;
      supplierId: string | null;
      mlItemId: string | null;
    }

    const compiledItems: CompiledItem[] = [];
    let totalSupplierCost = 0;
    let primarySupplierId: string | null = null;

    for (const item of orderItems) {
      const mlItemId = item.item?.id ?? null;
      const unitPrice = Number(item.unit_price ?? 0);
      const quantity = Number(item.quantity ?? 1);

      // Buscar produto publicado
      let matchedProductId: string | null = null;
      if (mlItemId) {
        const { data: published } = await supabase
          .from('mercadolivre_published_products')
          .select('product_id')
          .eq('ml_item_id', mlItemId)
          .maybeSingle();
        matchedProductId = published?.product_id ?? null;
      }

      // Fallback para SKU
      if (!matchedProductId && item.item?.seller_custom_field) {
        const { data: prodBySku } = await supabase
          .from('products')
          .select('id')
          .eq('sku', item.item.seller_custom_field)
          .maybeSingle();
        matchedProductId = prodBySku?.id ?? null;
      }

      let costPrice = 0;
      let productName = item.item?.title || 'Produto Mercado Livre';
      let sku: string | null = item.item?.seller_custom_field ?? null;
      let supplierId: string | null = null;

      if (matchedProductId) {
        const { data: dbProduct } = await supabase
          .from('products')
          .select('id, name, cost_price, supplier_id, sku')
          .eq('id', matchedProductId)
          .single();

        if (dbProduct) {
          productName = dbProduct.name;
          sku = dbProduct.sku || sku;
          costPrice = Number(dbProduct.cost_price ?? 0);
          supplierId = dbProduct.supplier_id;
          if (supplierId && !primarySupplierId) primarySupplierId = supplierId;
        }
      }

      const itemTotalCost = Math.round(costPrice * quantity * 100) / 100;
      totalSupplierCost += itemTotalCost;

      compiledItems.push({
        productId: matchedProductId,
        name: productName,
        sku,
        quantity,
        unitPrice,
        costPrice,
        totalCost: itemTotalCost,
        supplierId,
        mlItemId,
      });
    }

    totalSupplierCost = Math.round(totalSupplierCost * 100) / 100;

    // Buscar nome do fornecedor principal se houver
    let supplierName: string | null = null;
    if (primarySupplierId) {
      const { data: supProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, company_name')
        .eq('user_id', primarySupplierId)
        .maybeSingle();
      supplierName = supProfile?.company_name || `${supProfile?.first_name || ''} ${supProfile?.last_name || ''}`.trim() || null;
    }

    // Gerar número de pedido sequencial
    const { data: orderNumData } = await supabase.rpc('generate_order_number');
    const orderNumber = (orderNumData as string) || String(Date.now()).slice(-8);

    // =========================================================================
    // LÓGICA DE PAGAMENTO MISTO: CARTEIRA + PIX (Expiração 24h)
    // =========================================================================
    // Buscar ou inicializar carteira do revendedor
    let { data: wallet } = await supabase
      .from('wallets')
      .select('id, saldo')
      .eq('user_id', resellerUserId)
      .maybeSingle();

    if (!wallet) {
      const { data: newWallet } = await supabase
        .from('wallets')
        .insert({ user_id: resellerUserId, saldo: 0 })
        .select('id, saldo')
        .single();
      wallet = newWallet;
    }

    const currentWalletBalance = Number(wallet?.saldo ?? 0);
    let walletDeducted = 0;
    let remainingPixAmount = 0;
    let isFullyPaid = false;

    if (totalSupplierCost <= 0) {
      // Pedido sem custo de fornecedor catalogado
      isFullyPaid = true;
      remainingPixAmount = 0;
      walletDeducted = 0;
    } else if (currentWalletBalance >= totalSupplierCost) {
      // Cobertura 100% via saldo da carteira
      walletDeducted = totalSupplierCost;
      remainingPixAmount = 0;
      isFullyPaid = true;
    } else if (currentWalletBalance > 0 && currentWalletBalance < totalSupplierCost) {
      // Abate parcial: consome todo o saldo da carteira e gera Pix para a diferença
      walletDeducted = currentWalletBalance;
      remainingPixAmount = Math.round((totalSupplierCost - currentWalletBalance) * 100) / 100;
      isFullyPaid = false;
    } else {
      // Carteira zerada: Pix integral
      walletDeducted = 0;
      remainingPixAmount = totalSupplierCost;
      isFullyPaid = false;
    }

    console.log('[ml-order-webhook] Finanças do Fulfillment:', {
      totalSupplierCost,
      currentWalletBalance,
      walletDeducted,
      remainingPixAmount,
      isFullyPaid,
    });

    // Se houver valor pendente, gerar Pix com prazo de 24 horas
    let qrCode: string | null = null;
    let qrCodeBase64: string | null = null;
    let pixPaymentId: string | null = null;
    let pixExpiresAt: string | null = null;

    if (remainingPixAmount > 0) {
      const pixResult = await generatePix24h({
        orderNumber,
        amount: remainingPixAmount,
        description: `Fulfillment Pedido ML #${mlOrderId} (Ped. #${orderNumber})`,
        resellerUserId,
        resellerProfile,
        resellerEmail,
        items: compiledItems,
        mlOrderId: mlOrderIdStr,
        walletDeducted,
        totalCost: totalSupplierCost,
      });

      qrCode = pixResult.qrCode;
      qrCodeBase64 = pixResult.qrCodeBase64;
      pixPaymentId = pixResult.paymentId;
      pixExpiresAt = pixResult.expiresAt;
    }

    // Criar o pedido na tabela orders
    const shippingAddressPayload = {
      name: buyerName,
      email: buyerEmail,
      phone: buyerPhone,
      cpf: buyerDoc,
      receiver_name: buyerName,
      street: receiverAddress?.street_name || null,
      number: receiverAddress?.street_number || null,
      city: receiverAddress?.city?.name || null,
      state: receiverAddress?.state?.name || null,
      zip_code: receiverAddress?.zip_code || null,
      neighborhood: receiverAddress?.neighborhood?.name || null,
      comment: receiverAddress?.comment || null,
    };

    const notesSummary = `Pedido via Mercado Livre #${mlOrderIdStr}. Custo Fornecedor: R$ ${totalSupplierCost.toFixed(2)} | Abate Carteira: R$ ${walletDeducted.toFixed(2)} | Pix 24h: R$ ${remainingPixAmount.toFixed(2)}`;

    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: resellerUserId, // Dono do pedido no painel
        reseller_id: resellerUserId,
        order_number: orderNumber,
        total_amount: totalOrderAmount,
        payment_method: isFullyPaid ? 'wallet' : 'pix',
        payment_status: isFullyPaid ? 'paid' : 'pending',
        status: isFullyPaid ? 'recebido' : 'pendente',
        payment_id: isFullyPaid ? `wallet_${orderNumber}` : (pixPaymentId || `ml_${mlOrderIdStr}`),
        external_reference: `ml_pay_${orderNumber}`,
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
        payment_expires_at: isFullyPaid ? null : pixExpiresAt,
        ml_order_id: mlOrderIdStr,
        shipping_address: shippingAddressPayload,
        notes: notesSummary,
      })
      .select('id, order_number')
      .single();

    if (orderError || !newOrder) {
      console.error('[ml-order-webhook] Falha ao criar pedido no banco:', orderError);
      return new Response(JSON.stringify({ error: 'Falha ao criar pedido', details: orderError }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const orderId = newOrder.id;

    // Se houve abate na carteira, atualizar saldo e registrar transação
    if (walletDeducted > 0 && wallet) {
      const newWalletBalance = Math.round((currentWalletBalance - walletDeducted) * 100) / 100;
      await supabase
        .from('wallets')
        .update({ saldo: newWalletBalance, updated_at: new Date().toISOString() })
        .eq('id', wallet.id);

      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        tipo: 'pagamento_pedido',
        valor: walletDeducted,
        taxa: 0,
        valor_pago: walletDeducted,
        saldo_anterior: currentWalletBalance,
        saldo_posterior: newWalletBalance,
        descricao: isFullyPaid
          ? `Pagamento integral de pedido Mercado Livre #${mlOrderIdStr}`
          : `Abate parcial via carteira para pedido Mercado Livre #${mlOrderIdStr} (Pix restante: R$ ${remainingPixAmount.toFixed(2)})`,
        referencia_tipo: 'order',
        referencia_id: orderId,
        status: 'completed',
      });
      console.log(`[ml-order-webhook] Carteira debitada em R$ ${walletDeducted.toFixed(2)}. Novo saldo: R$ ${newWalletBalance.toFixed(2)}`);
    }

    // Inserir itens do pedido
    // Buscar um produto fallback se algum item não estiver cadastrado no catálogo
    let fallbackProductId: string | null = null;
    const { data: anyProduct } = await supabase.from('products').select('id').limit(1).maybeSingle();
    fallbackProductId = anyProduct?.id ?? null;

    for (const item of compiledItems) {
      const targetProductId = item.productId || fallbackProductId;
      if (!targetProductId) continue;

      await supabase.from('order_items').insert({
        order_id: orderId,
        product_id: targetProductId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: Math.round(item.unitPrice * item.quantity * 100) / 100,
        supplier_id: item.supplierId,
        supplier_unit_cost: item.costPrice,
        supplier_total_cost: item.totalCost,
        product_snapshot: {
          name: item.name,
          sku: item.sku,
          ml_item_id: item.mlItemId,
          cost_price: item.costPrice,
        },
      });
    }

    // Histórico de status
    await supabase.from('order_status_history').insert({
      order_id: orderId,
      status: isFullyPaid ? 'recebido' : 'pendente',
      notes: isFullyPaid
        ? `Pedido ML #${mlOrderIdStr} pago com sucesso via carteira — liberado para preparação de envio`
        : `Pedido ML #${mlOrderIdStr} recebido — aguardando pagamento Pix de fulfillment (24h)`,
    });

    // =========================================================================
    // ETIQUETA OFICIAL DO MERCADO LIVRE: DOWNLOAD E ARMAZENAMENTO
    // =========================================================================
    const shipmentId = mlOrder.shipments?.id
      ?? mlOrder.order_items?.[0]?.shipment?.id
      ?? null;

    let publicLabelUrl: string | null = null;
    let trackingCode: string | null = null;

    if (shipmentId) {
      try {
        console.log(`[ml-order-webhook] Buscando shipment ${shipmentId} no ML...`);
        // 1. Obter código de rastreio
        const shipmentRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (shipmentRes.ok) {
          const shipmentData = await shipmentRes.json();
          trackingCode = shipmentData.tracking_number ?? shipmentData.tracking_id ?? null;
        }

        // 2. Baixar PDF oficial da etiqueta
        const labelRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}/labels?response_type=pdf2`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (labelRes.ok) {
          const labelBytes = await labelRes.arrayBuffer();
          const filePath = `labels/${resellerUserId}/${orderId}/etiqueta-${mlOrderIdStr}.pdf`;

          // Tentar salvar no bucket 'shipping-labels' (fallback 'shipping-files')
          let targetBucket = 'shipping-labels';
          const uploadRes = await supabase.storage.from(targetBucket).upload(filePath, labelBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

          if (uploadRes.error) {
            console.warn('[ml-order-webhook] Falha no bucket shipping-labels, tentando shipping-files:', uploadRes.error);
            const fbRes = await supabase.storage.from('shipping-files').upload(filePath, labelBytes, {
              contentType: 'application/pdf',
              upsert: true,
            });
            if (!fbRes.error) targetBucket = 'shipping-files';
          }

          // Criar link assinado (7 dias = 604800s)
          const { data: signedData } = await supabase.storage
            .from(targetBucket)
            .createSignedUrl(filePath, 604800);

          publicLabelUrl = getPublicSignedUrl(signedData?.signedUrl) ?? `https://api.mercadolibre.com/shipments/${shipmentId}/labels?response_type=pdf2`;

          // Registrar na tabela de arquivos de envio
          await supabase.from('order_shipping_files').insert({
            order_id: orderId,
            file_name: `etiqueta-${mlOrderIdStr}.pdf`,
            file_path: filePath,
            file_size: labelBytes.byteLength,
            uploaded_at: new Date().toISOString(),
          });

          console.log(`[ml-order-webhook] ✅ Etiqueta PDF armazenada: ${filePath}`);
        } else {
          // Endpoint direto da API como fallback
          publicLabelUrl = `https://api.mercadolibre.com/shipments/${shipmentId}/labels?response_type=pdf2`;
          console.log('[ml-order-webhook] Etiqueta ainda não pronta em PDF, salvo endpoint de consulta');
        }

        // Atualizar pedido com os dados de envio
        await supabase
          .from('orders')
          .update({
            ml_shipment_id: String(shipmentId),
            ml_label_url: publicLabelUrl,
            tracking_code: trackingCode,
            has_shipping_file: true,
          })
          .eq('id', orderId);

      } catch (labelErr) {
        console.error('[ml-order-webhook] Erro ao processar etiqueta ML:', labelErr);
      }
    }

    // =========================================================================
    // DISPARO DO EVENTO DE WEBHOOK UNIFICADO: order.automatic_fulfillment
    // =========================================================================
    const automaticFulfillmentPayload = {
      event: 'order.automatic_fulfillment',
      timestamp: new Date().toISOString(),
      order: {
        id: orderId,
        order_number: newOrder.order_number,
        origin: 'mercadolivre',
        ml_order_id: mlOrderIdStr,
        ml_shipment_id: shipmentId ? String(shipmentId) : null,
        total_order_amount: totalOrderAmount,
        supplier_cost: totalSupplierCost,
        tracking_code: trackingCode,
        shipping_label_url: publicLabelUrl,
        status: isFullyPaid ? 'recebido' : 'pendente',
        created_at: new Date().toISOString(),
      },
      buyer: {
        name: buyerName,
        email: buyerEmail,
        phone: buyerPhone,
        document: buyerDoc,
        shipping_address: shippingAddressPayload,
      },
      reseller: {
        id: resellerUserId,
        name: resellerProfile ? `${resellerProfile.first_name || ''} ${resellerProfile.last_name || ''}`.trim() : null,
        email: resellerEmail,
        phone: resellerProfile?.phone || null,
        store_name: resellerStore?.store_name || null,
      },
      supplier: {
        id: primarySupplierId,
        name: supplierName,
      },
      items: compiledItems.map((i) => ({
        product_id: i.productId,
        name: i.name,
        sku: i.sku,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        cost_price: i.costPrice,
        total_cost: i.totalCost,
        ml_item_id: i.mlItemId,
      })),
      payment: {
        total_cost: totalSupplierCost,
        wallet_balance_before: currentWalletBalance,
        wallet_deducted: walletDeducted,
        wallet_balance_after: Math.max(0, currentWalletBalance - walletDeducted),
        pix_amount_required: remainingPixAmount,
        pix_qr_code: qrCode,
        pix_qr_code_base64: qrCodeBase64,
        pix_payment_id: pixPaymentId,
        pix_expires_at: isFullyPaid ? null : pixExpiresAt,
        is_fully_paid: isFullyPaid,
      },
    };

    try {
      console.log(`[ml-order-webhook] Disparando webhook order.automatic_fulfillment para pedido #${newOrder.order_number}...`);
      await supabase.functions.invoke('dispatch-webhook', {
        body: {
          event_type: 'order.automatic_fulfillment',
          payload: automaticFulfillmentPayload,
        },
      });
      console.log(`[ml-order-webhook] ✅ Webhook order.automatic_fulfillment despachado com sucesso!`);
    } catch (dispatchErr) {
      console.error('[ml-order-webhook] Erro ao despachar webhook order.automatic_fulfillment:', dispatchErr);
    }

    // =========================================================================
    // NOTIFICAÇÃO IN-APP PARA O REVENDEDOR
    // =========================================================================
    if (resellerUserId) {
      const title = isFullyPaid
        ? '🛒 Pedido ML pago via Carteira!'
        : '⚡ Novo pedido ML: Pague o Pix de fulfillment!';

      const message = isFullyPaid
        ? `Pedido #${newOrder.order_number} (ML #${mlOrderIdStr}) teve o custo de R$ ${totalSupplierCost.toFixed(2)} pago com sua carteira. A etiqueta foi liberada para o fornecedor!`
        : `Pedido #${newOrder.order_number} (ML #${mlOrderIdStr}) recebido! Custo do fornecedor: R$ ${totalSupplierCost.toFixed(2)}${walletDeducted > 0 ? ` (R$ ${walletDeducted.toFixed(2)} abatido da carteira)` : ''}. Pague o Pix restante de R$ ${remainingPixAmount.toFixed(2)} em até 24h para liberar o envio.`;

      await supabase.from('notifications').insert({
        user_id: resellerUserId,
        title,
        message,
        type: isFullyPaid ? 'order_paid' : 'payment_pending',
        action_url: '/reseller/pedidos',
        action_label: 'Ver Pedido',
      });
    }

    console.log(`✅ [ml-order-webhook] Pedido #${newOrder.order_number} processado com sucesso!`);
    return new Response(
      JSON.stringify({
        success: true,
        order_id: orderId,
        order_number: newOrder.order_number,
        is_fully_paid: isFullyPaid,
        wallet_deducted: walletDeducted,
        pix_amount_required: remainingPixAmount,
        has_shipping_label: !!publicLabelUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('[ml-order-webhook] Erro geral:', err);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar pedido ML', details: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
