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
  mlUserId?: number;
}

/**
 * Obtém token válido para uma integração específica, renovando preventivamente se necessário.
 */
async function getValidTokenForIntegration(integration: {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  ml_user_id?: number | null;
}): Promise<string> {
  let accessToken = integration.access_token;
  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;

  if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
    try {
      const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
        body: { user_id: integration.user_id },
      });
      if (refreshData?.access_token) {
        accessToken = refreshData.access_token;
      }
    } catch (err) {
      console.warn('[ml-order-webhook] Falha no refresh preventivo, usando token atual:', err);
    }
  }

  return accessToken;
}

/**
 * Encontra a conta/revendedor dona de um pedido no Mercado Livre.
 * Se informado preferredUserId (user_id do sistema ou ml_user_id), testa essa conta primeiro.
 * Caso contrário, ou se falhar, busca nas contas ativas até encontrar a conta dona do pedido.
 */
async function findSellerForOrder(
  mlOrderId: string,
  preferredUserId?: string | number | null
): Promise<{ accessToken: string; resellerUserId: string; mlOrder: any; mlUserId?: number } | null> {
  // 1. Tentar com preferredUserId se fornecido
  if (preferredUserId) {
    let query = supabase
      .from('mercadolivre_integrations')
      .select('access_token, refresh_token, expires_at, user_id, ml_user_id')
      .eq('is_active', true);

    const numericId = Number(preferredUserId);
    if (!isNaN(numericId) && numericId > 0) {
      query = query.or(`ml_user_id.eq.${numericId},user_id.eq.${preferredUserId}`);
    } else {
      query = query.eq('user_id', String(preferredUserId));
    }

    const { data: prefIntg } = await query.maybeSingle();

    if (prefIntg) {
      const token = await getValidTokenForIntegration(prefIntg);
      const res = await fetch(`https://api.mercadolibre.com/orders/${mlOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const mlOrder = await res.json();
        return {
          accessToken: token,
          resellerUserId: prefIntg.user_id,
          mlOrder,
          mlUserId: prefIntg.ml_user_id || mlOrder.seller?.id,
        };
      }
    }
  }

  // 2. Busca entre todas as contas ativas conectadas no Mercado Livre
  console.log(`[ml-order-webhook] Buscando proprietário do pedido ML #${mlOrderId} entre contas ativas...`);
  const { data: allIntegrations, error } = await supabase
    .from('mercadolivre_integrations')
    .select('user_id, ml_user_id, access_token, refresh_token, expires_at')
    .eq('is_active', true);

  if (error || !allIntegrations || allIntegrations.length === 0) {
    console.error('[ml-order-webhook] Nenhuma integração ML ativa encontrada no banco.');
    return null;
  }

  for (const intg of allIntegrations) {
    try {
      const token = await getValidTokenForIntegration(intg);
      const res = await fetch(`https://api.mercadolibre.com/orders/${mlOrderId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (res.ok) {
        const mlOrder = await res.json();
        console.log(`[ml-order-webhook] ✅ Pedido ML #${mlOrderId} pertence ao revendedor ${intg.user_id} (ML User: ${mlOrder.seller?.id})`);

        // Se ml_user_id não estava salvo no banco, atualizar para agilizar futuras buscas
        if (!intg.ml_user_id && mlOrder.seller?.id) {
          await supabase
            .from('mercadolivre_integrations')
            .update({ ml_user_id: mlOrder.seller.id, updated_at: new Date().toISOString() })
            .eq('user_id', intg.user_id);
        }

        return {
          accessToken: token,
          resellerUserId: intg.user_id,
          mlOrder,
          mlUserId: mlOrder.seller?.id || intg.ml_user_id,
        };
      }
    } catch (testErr) {
      console.warn(`[ml-order-webhook] Erro ao testar integração ${intg.user_id}:`, testErr);
    }
  }

  return null;
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

/**
 * Processa um único pedido do Mercado Livre de forma ponta a ponta.
 */
async function processSingleMlOrder(
  mlOrderId: string,
  preferredUserId?: string | number | null
): Promise<{
  success: boolean;
  order_id?: string;
  order_number?: string;
  already_processed?: boolean;
  is_fully_paid?: boolean;
  wallet_deducted?: number;
  pix_amount_required?: number;
  has_shipping_label?: boolean;
  error?: string;
  details?: any;
}> {
  const mlOrderIdStr = String(mlOrderId);

  // Idempotência: verificar se pedido já foi registrado no banco
  const { data: existingOrder } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status')
    .or(`payment_id.eq.ml_${mlOrderIdStr},ml_order_id.eq.${mlOrderIdStr}`)
    .maybeSingle();

  if (existingOrder) {
    console.log(`[ml-order-webhook] Pedido ML #${mlOrderIdStr} já existe: #${existingOrder.order_number}`);
    return {
      success: true,
      already_processed: true,
      order_id: existingOrder.id,
      order_number: existingOrder.order_number,
    };
  }

  // Localizar o revendedor/conta correspondente e os dados do pedido no Mercado Livre
  const sellerInfo = await findSellerForOrder(mlOrderIdStr, preferredUserId);
  if (!sellerInfo) {
    console.error('[ml-order-webhook] Pedido ML não encontrado em nenhuma conta conectada:', mlOrderIdStr);
    return {
      success: false,
      error: `Pedido #${mlOrderIdStr} não foi localizado em nenhuma conta Mercado Livre conectada`,
    };
  }

  const { accessToken, resellerUserId, mlOrder } = sellerInfo;

  console.log(`[ml-order-webhook] Pedido ML #${mlOrderIdStr} recuperado. Status ML:`, mlOrder.status);

  // Processar apenas pedidos pagos no Mercado Livre
  if (mlOrder.status !== 'paid') {
    console.log('[ml-order-webhook] Pedido ML ainda não está pago. Status:', mlOrder.status);
    return {
      success: true,
      already_processed: false,
      error: `Pedido ML ainda não está pago (status: ${mlOrder.status})`,
    };
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

  // Buscar perfil e loja do revendedor
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

    // Extrair SKU enviado no anúncio do Mercado Livre
    const rawSku = (
      item.item?.seller_sku ||
      item.item?.seller_custom_field ||
      item.item?.variation_attributes?.find((a: any) => a.id === 'SELLER_SKU')?.value_name ||
      ''
    ).trim() || null;

    let matchedProductId: string | null = null;

    // 1. Tentar localizar por ml_item_id em mercadolivre_published_products
    if (mlItemId) {
      const { data: published } = await supabase
        .from('mercadolivre_published_products')
        .select('product_id')
        .eq('ml_item_id', mlItemId)
        .maybeSingle();
      matchedProductId = published?.product_id ?? null;
    }

    // 2. Tentar localizar por ml_item_id em ml_listing_variants
    if (!matchedProductId && mlItemId) {
      const { data: variantByItem } = await supabase
        .from('ml_listing_variants')
        .select('product_id')
        .eq('ml_item_id', mlItemId)
        .maybeSingle();
      matchedProductId = variantByItem?.product_id ?? null;
    }

    // 3. Fallback: localizar por SKU na tabela products
    if (!matchedProductId && rawSku) {
      const { data: prodBySku } = await supabase
        .from('products')
        .select('id')
        .or(`sku.eq.${rawSku},internal_sku.eq.${rawSku}`)
        .maybeSingle();
      matchedProductId = prodBySku?.id ?? null;
    }

    // 4. Fallback: localizar por SKU na tabela ml_listing_variants
    if (!matchedProductId && rawSku) {
      const { data: variantBySku } = await supabase
        .from('ml_listing_variants')
        .select('product_id')
        .eq('sku', rawSku)
        .maybeSingle();
      matchedProductId = variantBySku?.product_id ?? null;
    }

    let costPrice = 0;
    let productName = item.item?.title || 'Produto Mercado Livre';
    let sku: string | null = rawSku;
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

  // Buscar fornecedor principal se houver
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

  // Lógica financeira: Carteira + Pix (Expiração 24h)
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
    isFullyPaid = true;
    remainingPixAmount = 0;
    walletDeducted = 0;
  } else if (currentWalletBalance >= totalSupplierCost) {
    walletDeducted = totalSupplierCost;
    remainingPixAmount = 0;
    isFullyPaid = true;
  } else if (currentWalletBalance > 0 && currentWalletBalance < totalSupplierCost) {
    walletDeducted = currentWalletBalance;
    remainingPixAmount = Math.round((totalSupplierCost - currentWalletBalance) * 100) / 100;
    isFullyPaid = false;
  } else {
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

  let qrCode: string | null = null;
  let qrCodeBase64: string | null = null;
  let pixPaymentId: string | null = null;
  let pixExpiresAt: string | null = null;

  if (remainingPixAmount > 0) {
    const pixResult = await generatePix24h({
      orderNumber,
      amount: remainingPixAmount,
      description: `Fulfillment Pedido ML #${mlOrderIdStr} (Ped. #${orderNumber})`,
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
      user_id: resellerUserId,
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
    return {
      success: false,
      error: 'Falha ao salvar pedido no banco de dados',
      details: orderError,
    };
  }

  const orderId = newOrder.id;

  // Registrar abate de carteira se houver
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

  // Etiqueta oficial do Mercado Livre
  const shipmentId = mlOrder.shipments?.id
    ?? mlOrder.order_items?.[0]?.shipment?.id
    ?? null;

  let publicLabelUrl: string | null = null;
  let trackingCode: string | null = null;

  if (shipmentId) {
    try {
      console.log(`[ml-order-webhook] Buscando shipment ${shipmentId} no ML...`);
      const shipmentRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (shipmentRes.ok) {
        const shipmentData = await shipmentRes.json();
        trackingCode = shipmentData.tracking_number ?? shipmentData.tracking_id ?? null;
      }

      const labelRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}/labels?response_type=pdf2`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (labelRes.ok) {
        const labelBytes = await labelRes.arrayBuffer();
        const filePath = `labels/${resellerUserId}/${orderId}/etiqueta-${mlOrderIdStr}.pdf`;

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

        const { data: signedData } = await supabase.storage
          .from(targetBucket)
          .createSignedUrl(filePath, 604800);

        publicLabelUrl = getPublicSignedUrl(signedData?.signedUrl) ?? `https://api.mercadolibre.com/shipments/${shipmentId}/labels?response_type=pdf2`;

        await supabase.from('order_shipping_files').insert({
          order_id: orderId,
          file_name: `etiqueta-${mlOrderIdStr}.pdf`,
          file_path: filePath,
          file_size: labelBytes.byteLength,
          uploaded_at: new Date().toISOString(),
        });

        console.log(`[ml-order-webhook] ✅ Etiqueta PDF armazenada: ${filePath}`);
      } else {
        publicLabelUrl = `https://api.mercadolibre.com/shipments/${shipmentId}/labels?response_type=pdf2`;
        console.log('[ml-order-webhook] Etiqueta ainda não pronta em PDF, salvo endpoint de consulta');
      }

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

  // Notificação in-app para o revendedor
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

  // Disparar evento de webhook
  try {
    console.log(`[ml-order-webhook] Disparando webhook order.automatic_fulfillment para pedido #${newOrder.order_number}...`);
    await supabase.functions.invoke('dispatch-webhook', {
      body: {
        event_type: 'order.automatic_fulfillment',
        payload: {
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
        },
      },
    });
    console.log(`[ml-order-webhook] ✅ Webhook order.automatic_fulfillment despachado com sucesso!`);
  } catch (dispatchErr) {
    console.error('[ml-order-webhook] Erro ao despachar webhook order.automatic_fulfillment:', dispatchErr);
  }

  console.log(`✅ [ml-order-webhook] Pedido #${newOrder.order_number} processado com sucesso!`);
  return {
    success: true,
    order_id: orderId,
    order_number: newOrder.order_number,
    is_fully_paid: isFullyPaid,
    wallet_deducted: walletDeducted,
    pix_amount_required: remainingPixAmount,
    has_shipping_label: !!publicLabelUrl,
  };
}

/**
 * Sincroniza os pedidos recentes de um revendedor buscando direto na API do Mercado Livre.
 */
async function syncResellerRecentOrders(resellerUserId: string) {
  console.log(`[ml-order-webhook] Sincronizando pedidos recentes do revendedor: ${resellerUserId}`);

  const { data: intg, error } = await supabase
    .from('mercadolivre_integrations')
    .select('user_id, ml_user_id, access_token, refresh_token, expires_at')
    .eq('user_id', resellerUserId)
    .eq('is_active', true)
    .single();

  if (error || !intg) {
    throw new Error('Integração do Mercado Livre não encontrada ou inativa para este revendedor.');
  }

  const token = await getValidTokenForIntegration(intg);

  // Se ml_user_id não está salvo, buscar via /users/me
  let mlUserId = intg.ml_user_id;
  if (!mlUserId) {
    try {
      const meRes = await fetch('https://api.mercadolibre.com/users/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        mlUserId = meData.id;
        await supabase
          .from('mercadolivre_integrations')
          .update({ ml_user_id: mlUserId, updated_at: new Date().toISOString() })
          .eq('user_id', resellerUserId);
      }
    } catch (meErr) {
      console.warn('[ml-order-webhook] Falha ao obter /users/me:', meErr);
    }
  }

  if (!mlUserId) {
    throw new Error('Não foi possível identificar o ID do vendedor no Mercado Livre.');
  }

  // Buscar pedidos recentes (últimos 50 pedidos)
  const searchUrl = `https://api.mercadolibre.com/orders/search?seller=${mlUserId}&order.status=paid&sort=date_desc&limit=50`;
  const searchRes = await fetch(searchUrl, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    throw new Error(`Falha ao buscar pedidos no Mercado Livre: ${searchRes.status} ${errText}`);
  }

  const searchData = await searchRes.json();
  const mlOrders = searchData.results || [];
  console.log(`[ml-order-webhook] Encontrados ${mlOrders.length} pedidos no Mercado Livre para o usuário ${mlUserId}`);

  let imported = 0;
  let alreadyExisted = 0;
  const errors: string[] = [];

  for (const order of mlOrders) {
    const orderIdStr = String(order.id);
    try {
      const result = await processSingleMlOrder(orderIdStr, resellerUserId);
      if (result.already_processed) {
        alreadyExisted++;
      } else if (result.success) {
        imported++;
      } else if (result.error) {
        errors.push(`Pedido #${orderIdStr}: ${result.error}`);
      }
    } catch (orderErr: any) {
      errors.push(`Pedido #${orderIdStr}: ${orderErr.message}`);
    }
  }

  return {
    total_found: mlOrders.length,
    imported,
    already_existed: alreadyExisted,
    errors,
  };
}

/**
 * Sincroniza pedidos recentes de todas as contas ativas do Mercado Livre.
 */
async function syncAllRecentOrders() {
  const { data: allIntegrations, error } = await supabase
    .from('mercadolivre_integrations')
    .select('user_id')
    .eq('is_active', true);

  if (error || !allIntegrations) {
    throw new Error(`Erro ao buscar integrações ativas: ${error?.message}`);
  }

  const results: Record<string, any> = {};
  let totalImported = 0;
  let totalFound = 0;

  for (const intg of allIntegrations) {
    try {
      const res = await syncResellerRecentOrders(intg.user_id);
      results[intg.user_id] = res;
      totalImported += res.imported;
      totalFound += res.total_found;
    } catch (err: any) {
      results[intg.user_id] = { error: err.message };
    }
  }

  return {
    total_accounts: allIntegrations.length,
    total_orders_found: totalFound,
    total_imported: totalImported,
    details: results,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    console.log('[ml-order-webhook] Payload recebido:', JSON.stringify(body));

    // Ação 1: Sincronização manual dos pedidos de um revendedor específico
    if (body.action === 'sync_reseller_orders' && body.user_id) {
      const summary = await syncResellerRecentOrders(body.user_id);
      return new Response(JSON.stringify({ success: true, summary }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação 2: Sincronização em lote de todas as contas ativas (Cron ou Super Admin)
    if (body.action === 'sync_all_recent_orders' || body.mode === 'sync_all_recent_orders') {
      const summary = await syncAllRecentOrders();
      return new Response(JSON.stringify({ success: true, summary }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação Debug: Verificar contas conectadas e testar busca do pedido
    if (body.action === 'debug_order') {
      const orderId = body.order_id || '2000015725821079';
      const shipmentId = body.shipment_id || '48358493709';
      const { data: allIntegrations } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id, ml_user_id, access_token, refresh_token, expires_at')
        .eq('is_active', true);

      const accounts: any[] = [];
      for (const intg of allIntegrations || []) {
        const token = await getValidTokenForIntegration(intg);
        let meData = null;
        try {
          const meRes = await fetch('https://api.mercadolibre.com/users/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (meRes.ok) meData = await meRes.json();
        } catch {}

        let orderStatus = null;
        let orderError = null;
        try {
          const oRes = await fetch(`https://api.mercadolibre.com/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          orderStatus = oRes.status;
          if (!oRes.ok) orderError = await oRes.text();
          else orderError = 'SUCCESS';
        } catch (e: any) {
          orderError = e.message;
        }

        let shipmentStatus = null;
        let shipmentError = null;
        try {
          const sRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          shipmentStatus = sRes.status;
          if (!sRes.ok) shipmentError = await sRes.text();
          else shipmentError = 'SUCCESS';
        } catch (e: any) {
          shipmentError = e.message;
        }

        accounts.push({
          user_id: intg.user_id,
          ml_user_id: intg.ml_user_id,
          nickname: meData?.nickname,
          email: meData?.email,
          order_test: { status: orderStatus, result: orderError },
          shipment_test: { status: shipmentStatus, result: shipmentError }
        });
      }

      return new Response(JSON.stringify({ success: true, accounts }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação 3: Importação direta por ID de pedido
    if (body.action === 'process_order' || body.order_id) {
      const targetOrderId = String(body.order_id || body.ml_order_id);
      const result = await processSingleMlOrder(targetOrderId, body.user_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { topic, resource, user_id: mlUserId, seller_id: sellerId } = body;

    // Ping de teste do Mercado Livre
    if (!topic || !resource) {
      return new Response(JSON.stringify({ ok: true, message: 'Ping recebido' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Notificação de Shipment do Mercado Livre: extrair pedido e processar
    if (topic === 'shipments') {
      const shipmentIdMatch = resource.match(/\/shipments\/(\d+)/);
      if (shipmentIdMatch) {
        const shipmentId = shipmentIdMatch[1];
        console.log(`[ml-order-webhook] Recebido tópico shipments #${shipmentId}. Buscando pedido associado...`);
        // Encontrar shipment nas contas ativas
        const { data: allIntegrations } = await supabase
          .from('mercadolivre_integrations')
          .select('user_id, access_token, refresh_token, expires_at')
          .eq('is_active', true);

        for (const intg of allIntegrations || []) {
          try {
            const token = await getValidTokenForIntegration(intg);
            const shRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (shRes.ok) {
              const shData = await shRes.json();
              if (shData.order_id) {
                console.log(`[ml-order-webhook] Shipment #${shipmentId} pertence ao pedido ML #${shData.order_id}`);
                const result = await processSingleMlOrder(String(shData.order_id), intg.user_id);
                return new Response(JSON.stringify(result), {
                  status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                });
              }
            }
          } catch {}
        }
      }

      return new Response(JSON.stringify({ ok: true, shipment_handled: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Apenas pedidos (orders_v2 ou orders)
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

    const result = await processSingleMlOrder(mlOrderId, mlUserId || sellerId);
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[ml-order-webhook] Erro geral:', err);
    return new Response(JSON.stringify({ error: 'Erro interno ao processar webhook ML', details: err?.message || String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
