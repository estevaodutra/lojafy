// ml-order-webhook v2.5 - deduplication, pack reference and pix fulfillment
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
 * Busca dados completos de um pedido no Mercado Livre.
 * Suporta IDs de pedido (/orders/{id}), IDs de carrinho/pacote (/packs/{id}) e IDs de remessa (/shipments/{id}).
 */
async function fetchOrderOrPack(id: string, token: string): Promise<any | null> {
  const cleanId = String(id).trim();

  // 1. Tentar /orders/{id}
  try {
    const oRes = await fetch(`https://api.mercadolibre.com/orders/${cleanId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (oRes.ok) {
      const mlOrder = await oRes.json();
      return mlOrder;
    }
  } catch {}

  // 2. Tentar /packs/{id} (pedidos com múltiplos itens ou gerados via carrinho)
  try {
    const pRes = await fetch(`https://api.mercadolibre.com/packs/${cleanId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (pRes.ok) {
      const pack = await pRes.json();
      const firstOrderId = pack.orders?.[0]?.id;
      if (firstOrderId) {
        const subRes = await fetch(`https://api.mercadolibre.com/orders/${firstOrderId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (subRes.ok) {
          const mlOrder = await subRes.json();
          mlOrder.pack_id = pack.id || cleanId;
          return mlOrder;
        }
      }
    }
  } catch {}

  // 3. Tentar /shipments/{id}
  try {
    const shRes = await fetch(`https://api.mercadolibre.com/shipments/${cleanId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (shRes.ok) {
      const shData = await shRes.json();
      if (shData.order_id) {
        const subRes = await fetch(`https://api.mercadolibre.com/orders/${shData.order_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (subRes.ok) {
          const mlOrder = await subRes.json();
          if (shData.pack_id) mlOrder.pack_id = shData.pack_id;
          return mlOrder;
        }
      }
    }
  } catch {}

  return null;
}

/**
 * Encontra a conta/revendedor dona de um pedido no Mercado Livre.
 * Testa preferredUserId primeiro; se falhar, busca nas contas ativas.
 */
async function findSellerForOrder(
  mlOrderId: string,
  preferredUserId?: string | number | null
): Promise<{ accessToken: string; resellerUserId: string; mlOrder: any; mlUserId?: number } | null> {
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
      const mlOrder = await fetchOrderOrPack(mlOrderId, token);

      if (mlOrder) {
        return {
          accessToken: token,
          resellerUserId: prefIntg.user_id,
          mlOrder,
          mlUserId: prefIntg.ml_user_id || mlOrder.seller?.id,
        };
      }
    }
  }

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
      const mlOrder = await fetchOrderOrPack(mlOrderId, token);

      if (mlOrder) {
        console.log(`[ml-order-webhook] ✅ Pedido ML #${mlOrderId} pertence ao revendedor ${intg.user_id} (ML User: ${mlOrder.seller?.id})`);

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
 * Localiza com máxima precisão o produto do catálogo da Lojafy correspondente a um item vendido no Mercado Livre.
 * Valida a coerência semântica entre o SKU retornado e o título do anúncio, prevenindo que
 * erros de digitação no seller_sku do Mercado Livre vinculem produtos totalmente incorretos.
 */
async function resolveMatchedProduct(
  item: any,
  mlItemId: string | null,
  resellerUserId?: string | null
): Promise<{ product: any; matchedBy: string }> {
  const itemTitle = (item.item?.title || '').trim();
  const rawSku = (
    item.item?.seller_sku ||
    item.item?.seller_custom_field ||
    item.item?.variation_attributes?.find((a: any) => a.id === 'SELLER_SKU')?.value_name ||
    ''
  ).trim() || null;

  let matchedProduct: any = null;
  let matchedBy = 'none';

  // 1. Tentar por ml_item_id em mercadolivre_published_products
  if (mlItemId) {
    const { data: pub } = await supabase
      .from('mercadolivre_published_products')
      .select('product_id')
      .eq('ml_item_id', mlItemId)
      .maybeSingle();
    if (pub?.product_id) {
      const { data: p } = await supabase.from('products').select('*').eq('id', pub.product_id).maybeSingle();
      if (p) {
        matchedProduct = p;
        matchedBy = 'published_products';
      }
    }
  }

  // 2. Tentar por ml_listing_variants (se tiver product_id vinculado)
  if (!matchedProduct && mlItemId) {
    const { data: vItem } = await supabase
      .from('ml_listing_variants')
      .select('product_id')
      .eq('ml_item_id', mlItemId)
      .not('product_id', 'is', null)
      .maybeSingle();
    if (vItem?.product_id) {
      const { data: p } = await supabase.from('products').select('*').eq('id', vItem.product_id).maybeSingle();
      if (p) {
        matchedProduct = p;
        matchedBy = 'listing_variants';
      }
    }
  }

  // 3. Tentar por SKU exato, validando se o título condiz com o produto
  if (!matchedProduct && rawSku) {
    const { data: prodBySku } = await supabase
      .from('products')
      .select('*')
      .eq('sku', rawSku)
      .maybeSingle();

    if (prodBySku) {
      if (!itemTitle) {
        matchedProduct = prodBySku;
        matchedBy = 'exact_sku';
      } else {
        const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ');
        const tTokens = new Set(normalize(itemTitle).split(/\s+/).filter(w => w.length > 3));
        const pTokens = new Set(normalize(prodBySku.name).split(/\s+/).filter(w => w.length > 3));

        let commonWords = 0;
        for (const tok of tTokens) {
          if (pTokens.has(tok)) commonWords++;
        }

        if (commonWords > 0 || tTokens.size === 0) {
          matchedProduct = prodBySku;
          matchedBy = 'sku_verified';
        } else {
          console.warn(`[ml-order-webhook] ⚠️ SKU ${rawSku} pertence a "${prodBySku.name}", mas o anúncio ML é "${itemTitle}". Títulos incompatíveis (0 palavras em comum)! Buscando produto real por título...`);
        }
      }
    }
  }

  // 4. Se não casou (ou SKU conflitava com o título), tentar correspondência por título no catálogo
  if (!matchedProduct && itemTitle) {
    // 4.1 Busca exata de título
    const { data: exactTitle } = await supabase
      .from('products')
      .select('*')
      .ilike('name', itemTitle.substring(0, 60))
      .maybeSingle();

    if (exactTitle) {
      matchedProduct = exactTitle;
      matchedBy = 'exact_title';
    } else {
      // 4.2 Busca fuzzy por tokens principais
      const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ');
      const words = normalize(itemTitle).split(/\s+/).filter(w => w.length >= 4);
      if (words.length >= 2) {
        const queryTerm = words.slice(0, 3).join('%');
        const { data: candidates } = await supabase
          .from('products')
          .select('*')
          .ilike('name', `%${queryTerm}%`)
          .limit(10);

        if (candidates && candidates.length > 0) {
          let bestCandidate = candidates[0];
          let bestScore = 0;
          for (const cand of candidates) {
            const cTokens = new Set(normalize(cand.name).split(/\s+/).filter(w => w.length > 3));
            let score = 0;
            for (const w of words) if (cTokens.has(w)) score++;
            if (score > bestScore) {
              bestScore = score;
              bestCandidate = cand;
            }
          }
          if (bestScore >= 2) {
            matchedProduct = bestCandidate;
            matchedBy = 'fuzzy_title';
          }
        }
      }
    }
  }

  // 5. Fallback final: se não encontrou nada por título, aceita o SKU retornado como último recurso
  if (!matchedProduct && rawSku) {
    const { data: prodBySkuFallback } = await supabase
      .from('products')
      .select('*')
      .eq('sku', rawSku)
      .maybeSingle();
    if (prodBySkuFallback) {
      matchedProduct = prodBySkuFallback;
      matchedBy = 'fallback_sku';
    }
  }

  // Se identificamos um produto com sucesso e temos ml_item_id, curar os mapeamentos no banco para próximas chamadas
  if (matchedProduct && mlItemId && (matchedBy === 'exact_title' || matchedBy === 'fuzzy_title' || matchedBy === 'sku_verified')) {
    try {
      if (resellerUserId) {
        await supabase.from('mercadolivre_published_products').upsert({
          user_id: resellerUserId,
          product_id: matchedProduct.id,
          ml_item_id: mlItemId,
          status: 'published',
          published_at: new Date().toISOString(),
        }, { onConflict: 'user_id,ml_item_id' });
      }

      await supabase.from('ml_listing_variants').update({
        product_id: matchedProduct.id,
        sku: matchedProduct.sku,
      }).eq('ml_item_id', mlItemId);
    } catch (healErr) {
      console.warn('[ml-order-webhook] Aviso ao curar mapeamento de anúncio:', healErr);
    }
  }

  return { product: matchedProduct, matchedBy };
}

/**
 * Repara um pedido existente garantindo que etiqueta, rastreio, itens, custo e cobrança Pix estejam 100% corretos.
 */
async function repairExistingOrder(orderRecord: any, resellerUserId: string) {
  const mlOrderIdStr = String(orderRecord.ml_order_id);
  console.log(`[ml-order-webhook] Reparando pedido #${orderRecord.order_number} (ML #${mlOrderIdStr})...`);

  const { data: intg } = await supabase
    .from('mercadolivre_integrations')
    .select('user_id, ml_user_id, access_token, refresh_token, expires_at')
    .eq('user_id', resellerUserId)
    .eq('is_active', true)
    .maybeSingle();

  if (!intg) return;
  const token = await getValidTokenForIntegration(intg);

  const mlOrder = await fetchOrderOrPack(mlOrderIdStr, token);
  if (!mlOrder) return;

  // 1. Extrair ID da remessa oficial (shipping.id no ML)
  const shipmentId = mlOrder.shipping?.id
    ?? mlOrder.shipping_id
    ?? mlOrder.shipments?.id
    ?? mlOrder.order_items?.[0]?.shipping?.id
    ?? mlOrder.order_items?.[0]?.shipment?.id
    ?? null;

  let publicLabelUrl = orderRecord.ml_label_url;
  let trackingCode = orderRecord.tracking_code;
  let isDelivered = false;
  let isShipped = false;

  if (shipmentId) {
    try {
      console.log(`[ml-order-webhook] Baixando shipment ${shipmentId} para pedido #${orderRecord.order_number}...`);
      const shRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (shRes.ok) {
        const shData = await shRes.json();
        trackingCode = shData.tracking_number ?? shData.tracking_id ?? trackingCode;
        if (shData.status === 'delivered') isDelivered = true;
        if (shData.status === 'shipped') isShipped = true;
      }

      if (!isDelivered) {
        const labelRes = await fetch(`https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (labelRes.ok) {
          const labelBytes = await labelRes.arrayBuffer();
          const filePath = `labels/${resellerUserId}/${orderRecord.id}/etiqueta-${mlOrderIdStr}.pdf`;
          let targetBucket = 'shipping-labels';
          const uploadRes = await supabase.storage.from(targetBucket).upload(filePath, labelBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });

          if (uploadRes.error) {
            const fbRes = await supabase.storage.from('shipping-files').upload(filePath, labelBytes, {
              contentType: 'application/pdf',
              upsert: true,
            });
            if (!fbRes.error) targetBucket = 'shipping-files';
          }

          const { data: signedData } = await supabase.storage.from(targetBucket).createSignedUrl(filePath, 604800);
          publicLabelUrl = getPublicSignedUrl(signedData?.signedUrl) ?? null;

          await supabase.from('order_shipping_files').upsert({
            order_id: orderRecord.id,
            file_name: `etiqueta-${mlOrderIdStr}.pdf`,
            file_path: filePath,
            file_size: labelBytes.byteLength,
            uploaded_at: new Date().toISOString(),
          }, { onConflict: 'order_id,file_path' });
        }
      }
    } catch (e) {
      console.warn(`[ml-order-webhook] Erro ao baixar etiqueta no repair:`, e);
    }
  }

  // 1.5 Extrair dados do comprador/endereço
  const buyerName = (
    mlOrder.shipping?.receiver_address?.receiver_name ||
    mlOrder.receiver_address?.receiver_name ||
    `${mlOrder.buyer?.first_name || ''} ${mlOrder.buyer?.last_name || ''}`.trim() ||
    mlOrder.buyer?.nickname ||
    orderRecord.shipping_address?.name ||
    'Cliente Mercado Livre'
  );
  const receiverAddress = mlOrder.shipping?.receiver_address || mlOrder.receiver_address;
  const shippingAddressPayload = {
    name: buyerName,
    email: mlOrder.buyer?.email || orderRecord.shipping_address?.email || null,
    phone: mlOrder.buyer?.phone?.number || orderRecord.shipping_address?.phone || null,
    cpf: mlOrder.buyer?.billing_info?.doc_number || orderRecord.shipping_address?.cpf || null,
    receiver_name: receiverAddress?.receiver_name || buyerName,
    street: receiverAddress?.street_name || orderRecord.shipping_address?.street || null,
    number: receiverAddress?.street_number || orderRecord.shipping_address?.number || null,
    city: receiverAddress?.city?.name || orderRecord.shipping_address?.city || null,
    state: receiverAddress?.state?.name || orderRecord.shipping_address?.state || null,
    zip_code: receiverAddress?.zip_code || orderRecord.shipping_address?.zip_code || null,
    neighborhood: receiverAddress?.neighborhood?.name || orderRecord.shipping_address?.neighborhood || null,
    comment: receiverAddress?.comment || orderRecord.shipping_address?.comment || null,
  };

  // 2. Recalcular itens e custo real do fornecedor
  const orderItems = mlOrder.order_items ?? [];
  let totalSupplierCost = 0;
  let primarySupplierId: string | null = null;
  const compiledItems: any[] = [];

  for (const item of orderItems) {
    const mlItemId = item.item?.id ?? null;
    const { product: matchedProd } = await resolveMatchedProduct(item, mlItemId, resellerUserId);

    const rawSku = (
      item.item?.seller_sku ||
      item.item?.seller_custom_field ||
      item.item?.variation_attributes?.find((a: any) => a.id === 'SELLER_SKU')?.value_name ||
      ''
    ).trim() || null;

    const unitPrice = Number(item.unit_price ?? 0);
    const quantity = Number(item.quantity ?? 1);
    const costPrice = Number(matchedProd?.cost_price ?? 0);
    const itemTotalCost = Math.round(costPrice * quantity * 100) / 100;
    totalSupplierCost += itemTotalCost;
    if (matchedProd?.supplier_id && !primarySupplierId) primarySupplierId = matchedProd.supplier_id;

    compiledItems.push({
      productId: matchedProd?.id ?? null,
      name: matchedProd?.name || item.item?.title || 'Produto Mercado Livre',
      sku: rawSku || matchedProd?.sku || null,
      quantity,
      unitPrice,
      costPrice,
      totalCost: itemTotalCost,
      supplierId: matchedProd?.supplier_id ?? null,
      mlItemId: item.item?.id ?? null,
      imageUrl: matchedProd?.image_url || matchedProd?.images?.[0] || null,
    });
  }

  totalSupplierCost = Math.round(totalSupplierCost * 100) / 100;

  // Atualizar itens do pedido no banco
  if (compiledItems.length > 0 && compiledItems[0].productId) {
    await supabase.from('order_items').delete().eq('order_id', orderRecord.id);
    for (const ci of compiledItems) {
      await supabase.from('order_items').insert({
        order_id: orderRecord.id,
        product_id: ci.productId,
        quantity: ci.quantity,
        unit_price: ci.unitPrice,
        total_price: Math.round(ci.unitPrice * ci.quantity * 100) / 100,
        supplier_id: ci.supplierId,
        supplier_unit_cost: ci.costPrice,
        supplier_total_cost: ci.totalCost,
        product_snapshot: {
          name: ci.name,
          sku: ci.sku,
          ml_item_id: ci.mlItemId,
          cost_price: ci.costPrice,
          image_url: ci.imageUrl,
        },
      });
    }
  }

  // 3. Checar status da remessa no ML (se já foi entregue ou despachado no ML)
  const { data: wallet } = await supabase.from('wallets').select('saldo').eq('user_id', resellerUserId).maybeSingle();
  const currentWalletBalance = Number(wallet?.saldo ?? 0);
  let walletDeducted = 0;
  let remainingPixAmount = 0;
  let isFullyPaid = false;

  if (isDelivered || isShipped) {
    isFullyPaid = true;
    remainingPixAmount = 0;
  } else if (totalSupplierCost <= 0) {
    isFullyPaid = false;
    remainingPixAmount = 0;
  } else if (currentWalletBalance >= totalSupplierCost) {
    walletDeducted = totalSupplierCost;
    remainingPixAmount = 0;
    isFullyPaid = true;
  } else if (currentWalletBalance > 0) {
    walletDeducted = currentWalletBalance;
    remainingPixAmount = Math.round((totalSupplierCost - currentWalletBalance) * 100) / 100;
    isFullyPaid = false;
  } else {
    remainingPixAmount = totalSupplierCost;
    isFullyPaid = false;
  }

  let qrCode = null;
  let qrCodeBase64 = null;
  let pixPaymentId = null;
  let pixExpiresAt = null;

  if (remainingPixAmount > 0 && !isDelivered && !isShipped) {
    const { data: resellerProfile } = await supabase.from('profiles').select('first_name, last_name, cpf, phone').eq('user_id', resellerUserId).maybeSingle();
    let resellerEmail = null;
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(resellerUserId);
      resellerEmail = authUser?.user?.email ?? null;
    } catch {}

    const pixRes = await generatePix24h({
      orderNumber: orderRecord.order_number,
      amount: remainingPixAmount,
      description: `Fulfillment Pedido ML #${mlOrderIdStr} (Ped. #${orderRecord.order_number})`,
      resellerUserId,
      resellerProfile,
      resellerEmail,
      items: compiledItems,
      mlOrderId: mlOrderIdStr,
      walletDeducted,
      totalCost: totalSupplierCost,
    });
    qrCode = pixRes.qrCode;
    qrCodeBase64 = pixRes.qrCodeBase64;
    pixPaymentId = pixRes.paymentId;
    pixExpiresAt = pixRes.expiresAt;
  }

  const notesSummary = `Pedido via Mercado Livre #${mlOrderIdStr}. Custo Fornecedor: R$ ${totalSupplierCost.toFixed(2)} | Abate Carteira: R$ ${walletDeducted.toFixed(2)} | Pix 24h: R$ ${remainingPixAmount.toFixed(2)}`;

  let finalStatus = 'pendente';
  let finalPaymentStatus = 'pending';
  let finalPaymentMethod = 'pix';

  if (isDelivered) {
    finalStatus = 'finalizado';
    finalPaymentStatus = 'paid';
    finalPaymentMethod = 'mercadolivre';
  } else if (isShipped) {
    finalStatus = 'enviado';
    finalPaymentStatus = 'paid';
    finalPaymentMethod = 'mercadolivre';
  } else if (isFullyPaid) {
    finalStatus = 'recebido';
    finalPaymentStatus = 'paid';
    finalPaymentMethod = 'wallet';
  }

  await supabase
    .from('orders')
    .update({
      status: finalStatus,
      payment_status: finalPaymentStatus,
      payment_method: finalPaymentMethod,
      pix_qr_code: isFullyPaid || isDelivered || isShipped ? null : qrCode,
      pix_qr_code_base64: isFullyPaid || isDelivered || isShipped ? null : qrCodeBase64,
      payment_expires_at: isFullyPaid || isDelivered || isShipped ? null : pixExpiresAt,
      payment_id: isDelivered || isShipped ? `ml_${mlOrderIdStr}` : (isFullyPaid ? `wallet_${orderRecord.order_number}` : (pixPaymentId || `ml_${mlOrderIdStr}`)),
      ml_shipment_id: shipmentId ? String(shipmentId) : orderRecord.ml_shipment_id,
      ml_label_url: publicLabelUrl,
      tracking_code: trackingCode,
      shipping_address: shippingAddressPayload,
      has_shipping_file: !!publicLabelUrl,
      notes: notesSummary,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderRecord.id);

  console.log(`✅ [ml-order-webhook] Pedido #${orderRecord.order_number} reparado! Status: ${finalStatus}, Custo: R$ ${totalSupplierCost}, Pix: R$ ${remainingPixAmount}, Etiqueta: ${!!publicLabelUrl}`);
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
  const mlOrderIdStr = String(mlOrderId).trim();

  // 1. Idempotência antecipada: verificar se já existe pedido por ml_order_id, payment_id ou notes
  const { data: existingOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, ml_shipment_id, ml_order_id')
    .or(`payment_id.eq.ml_${mlOrderIdStr},ml_order_id.eq.${mlOrderIdStr},notes.ilike.%#${mlOrderIdStr}%`)
    .limit(1);

  if (existingOrders && existingOrders.length > 0) {
    const existingOrder = existingOrders[0];
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

  // Determinar o identificador de referência que o revendedor vê no painel do ML (pack_id se houver, ou id)
  const packIdStr = mlOrder.pack_id ? String(mlOrder.pack_id) : null;
  const realOrderIdStr = String(mlOrder.id);
  const displayRef = packIdStr || realOrderIdStr;

  console.log(`[ml-order-webhook] Pedido ML recuperado. Ref: #${displayRef} (Order #${realOrderIdStr}). Status ML:`, mlOrder.status);

  // 2. Se for um carrinho/pack ou tiver pack_id, checar idempotência por ele e pelo order ID real
  const { data: checkExistingPack } = await supabase
    .from('orders')
    .select('id, order_number, status, payment_status, ml_shipment_id, ml_order_id')
    .or(`ml_order_id.eq.${displayRef},ml_order_id.eq.${realOrderIdStr},notes.ilike.%#${displayRef}%,notes.ilike.%#${realOrderIdStr}%`)
    .limit(1);

  if (checkExistingPack && checkExistingPack.length > 0) {
    const existingOrder = checkExistingPack[0];
    console.log(`[ml-order-webhook] Pedido ML #${displayRef} já existe no banco: #${existingOrder.order_number}`);
    return {
      success: true,
      already_processed: true,
      order_id: existingOrder.id,
      order_number: existingOrder.order_number,
    };
  }

  // 3. Checar idempotência pelo ID da remessa (shipping ID)
  const shipmentId = mlOrder.shipping?.id
    ?? mlOrder.shipping_id
    ?? mlOrder.shipments?.id
    ?? mlOrder.order_items?.[0]?.shipping?.id
    ?? mlOrder.order_items?.[0]?.shipment?.id
    ?? null;

  if (shipmentId) {
    const { data: checkExistingShipment } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, ml_shipment_id, ml_order_id')
      .eq('ml_shipment_id', String(shipmentId))
      .limit(1);

    if (checkExistingShipment && checkExistingShipment.length > 0) {
      const existingOrder = checkExistingShipment[0];
      console.log(`[ml-order-webhook] Pedido ML com remessa #${shipmentId} já existe no banco: #${existingOrder.order_number}`);
      return {
        success: true,
        already_processed: true,
        order_id: existingOrder.id,
        order_number: existingOrder.order_number,
      };
    }
  }

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

    const { product: dbProduct, matchedBy } = await resolveMatchedProduct(item, mlItemId, resellerUserId);
    const matchedProductId = dbProduct?.id ?? null;

    const rawSku = (
      item.item?.seller_sku ||
      item.item?.seller_custom_field ||
      item.item?.variation_attributes?.find((a: any) => a.id === 'SELLER_SKU')?.value_name ||
      ''
    ).trim() || null;

    let costPrice = 0;
    let productName = item.item?.title || 'Produto Mercado Livre';
    let sku: string | null = rawSku;
    let supplierId: string | null = null;

    if (dbProduct) {
      productName = dbProduct.name;
      sku = dbProduct.sku || sku;
      costPrice = Number(dbProduct.cost_price ?? 0);
      supplierId = dbProduct.supplier_id;
      if (supplierId && !primarySupplierId) primarySupplierId = supplierId;
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
      imageUrl: dbProduct?.image_url || dbProduct?.images?.[0] || null,
    });
  }

  totalSupplierCost = Math.round(totalSupplierCost * 100) / 100;

  let supplierName: string | null = null;
  if (primarySupplierId) {
    const { data: supProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, company_name')
      .eq('user_id', primarySupplierId)
      .maybeSingle();
    supplierName = supProfile?.company_name || `${supProfile?.first_name || ''} ${supProfile?.last_name || ''}`.trim() || null;
  }

  const { data: orderNumData } = await supabase.rpc('generate_order_number');
  const orderNumber = (orderNumData as string) || String(Date.now()).slice(-8);

  // Lógica financeira: Carteira + Pix
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
    isFullyPaid = false;
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

  const notesSummary = `Pedido via Mercado Livre #${displayRef} (ML Order #${realOrderIdStr}). Custo Fornecedor: R$ ${totalSupplierCost.toFixed(2)} | Abate Carteira: R$ ${walletDeducted.toFixed(2)} | Pix 24h: R$ ${remainingPixAmount.toFixed(2)}`;

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
      payment_id: isFullyPaid ? `wallet_${orderNumber}` : (pixPaymentId || `ml_${displayRef}`),
      external_reference: `ml_pay_${orderNumber}`,
      pix_qr_code: qrCode,
      pix_qr_code_base64: qrCodeBase64,
      payment_expires_at: isFullyPaid ? null : pixExpiresAt,
      ml_order_id: displayRef,
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
        image_url: item.imageUrl,
      },
    });
  }

  await supabase.from('order_status_history').insert({
    order_id: orderId,
    status: isFullyPaid ? 'recebido' : 'pendente',
    notes: isFullyPaid
      ? `Pedido ML #${displayRef} pago com sucesso via carteira — liberado para preparação de envio`
      : `Pedido ML #${displayRef} recebido — aguardando pagamento Pix de fulfillment (24h)`,
  });

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

      const labelRes = await fetch(`https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`, {
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
          const fbRes = await supabase.storage.from('shipping-files').upload(filePath, labelBytes, {
            contentType: 'application/pdf',
            upsert: true,
          });
          if (!fbRes.error) targetBucket = 'shipping-files';
        }

        const { data: signedData } = await supabase.storage
          .from(targetBucket)
          .createSignedUrl(filePath, 604800);

        publicLabelUrl = getPublicSignedUrl(signedData?.signedUrl) ?? null;

        await supabase.from('order_shipping_files').insert({
          order_id: orderId,
          file_name: `etiqueta-${mlOrderIdStr}.pdf`,
          file_path: filePath,
          file_size: labelBytes.byteLength,
          uploaded_at: new Date().toISOString(),
        });

        console.log(`[ml-order-webhook] ✅ Etiqueta PDF armazenada: ${filePath}`);
      } else {
        publicLabelUrl = null;
      }

      await supabase
        .from('orders')
        .update({
          ml_shipment_id: String(shipmentId),
          ml_label_url: publicLabelUrl,
          tracking_code: trackingCode,
          has_shipping_file: !!publicLabelUrl,
          shipping_label_status: publicLabelUrl ? 'ready' : 'pending',
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
 * Também repara automaticamente pedidos pré-existentes que faltem etiqueta ou cálculo de custo.
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

  // 1. Reparar pedidos existentes que estejam sem etiqueta ou com custo zerado
  const { data: existingUserOrders } = await supabase
    .from('orders')
    .select('*')
    .eq('reseller_id', resellerUserId)
    .not('ml_order_id', 'is', null);

  for (const existingOrd of existingUserOrders || []) {
    if (!existingOrd.ml_shipment_id || existingOrd.notes?.includes('Custo Fornecedor: R$ 0.00')) {
      try {
        await repairExistingOrder(existingOrd, resellerUserId);
      } catch (repErr) {
        console.warn(`[ml-order-webhook] Erro no auto-repair do pedido #${existingOrd.order_number}:`, repErr);
      }
    }
  }

  // 2. Buscar pedidos recentes no Mercado Livre (últimos 50 pedidos pagos)
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

/**
 * Sincroniza periodicamente ou sob demanda etiquetas pendentes do Mercado Livre.
 * Busca pedidos sem etiqueta, consulta a API do ML para saber se a remessa já está liberada (ready_to_print),
 * baixa o PDF, anexa ao pedido e avança o status operacional se o pedido já estiver pago.
 */
async function syncPendingLabels(options?: { resellerUserId?: string; orderId?: string }) {
  console.log('[ml-order-webhook] Iniciando syncPendingLabels...', options);

  let query = supabase
    .from('orders')
    .select('id, order_number, reseller_id, ml_order_id, ml_shipment_id, status, payment_status, created_at, has_shipping_file, ml_label_url, tracking_code, tracking_number')
    .not('ml_order_id', 'is', null)
    .not('status', 'in', '("cancelado","finalizado")')
    .order('created_at', { ascending: false })
    .limit(60);

  if (options?.orderId) {
    query = query.eq('id', options.orderId);
  } else if (options?.resellerUserId) {
    query = query.eq('reseller_id', options.resellerUserId);
  } else {
    // Apenas pedidos que realmente ainda não têm arquivo de etiqueta válido
    query = query.or('has_shipping_file.eq.false,ml_label_url.is.null');
  }

  const { data: pendingOrders, error: pError } = await query;
  if (pError || !pendingOrders) {
    console.error('[ml-order-webhook] Erro ao buscar pedidos pendentes de etiqueta:', pError);
    return { success: false, error: pError?.message };
  }

  console.log(`[ml-order-webhook] Encontrados ${pendingOrders.length} pedidos para checar etiquetas.`);

  // Cache de tokens por reseller
  const tokenMap = new Map<string, string>();
  let checked = 0;
  let downloaded = 0;
  let advancedToPaid = 0;
  let notReadyCount = 0;
  const errors: string[] = [];

  for (const ord of pendingOrders) {
    checked++;
    const resellerUserId = ord.reseller_id;
    if (!resellerUserId) continue;

    let token = tokenMap.get(resellerUserId);
    if (!token) {
      const { data: intg } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id, ml_user_id, access_token, refresh_token, expires_at')
        .eq('user_id', resellerUserId)
        .eq('is_active', true)
        .maybeSingle();

      if (intg) {
        token = await getValidTokenForIntegration(intg);
        tokenMap.set(resellerUserId, token);
      }
    }

    if (!token) {
      errors.push(`Sem integração ativa para revendedor ${resellerUserId}`);
      continue;
    }

    let shipmentId = ord.ml_shipment_id;
    const mlOrderIdStr = String(ord.ml_order_id);

    // Se não tiver shipment_id gravado, busca no pedido do Mercado Livre
    if (!shipmentId) {
      try {
        const mlOrder = await fetchOrderOrPack(mlOrderIdStr, token);
        if (mlOrder) {
          shipmentId = mlOrder.shipping?.id
            ?? mlOrder.shipping_id
            ?? mlOrder.shipments?.id
            ?? mlOrder.order_items?.[0]?.shipping?.id
            ?? mlOrder.order_items?.[0]?.shipment?.id
            ?? null;

          if (shipmentId) {
            await supabase.from('orders').update({ ml_shipment_id: String(shipmentId) }).eq('id', ord.id);
          }
        }
      } catch (err: any) {
        console.warn(`[ml-order-webhook] Erro ao buscar shipment_id do pedido #${ord.order_number}:`, err);
      }
    }

    if (!shipmentId) {
      notReadyCount++;
      continue;
    }

    // Consulta status da remessa no Mercado Livre
    try {
      const shRes = await fetch(`https://api.mercadolibre.com/shipments/${shipmentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!shRes.ok) {
        notReadyCount++;
        continue;
      }

      const shData = await shRes.json();
      const trackingCode = shData.tracking_number ?? shData.tracking_id ?? ord.tracking_code;

      // Tenta baixar a etiqueta se estiver pronta
      const labelRes = await fetch(`https://api.mercadolibre.com/shipment_labels?shipment_ids=${shipmentId}&response_type=pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!labelRes.ok) {
        notReadyCount++;
        continue; // Etiqueta ainda não foi liberada pelo ML (NOT_PRINTABLE_STATUS)
      }

      // Etiqueta liberada e baixada com sucesso!
      const labelBytes = await labelRes.arrayBuffer();
      const filePath = `labels/${resellerUserId}/${ord.id}/etiqueta-${mlOrderIdStr}.pdf`;
      let targetBucket = 'shipping-labels';

      const uploadRes = await supabase.storage.from(targetBucket).upload(filePath, labelBytes, {
        contentType: 'application/pdf',
        upsert: true,
      });

      if (uploadRes.error) {
        const fbRes = await supabase.storage.from('shipping-files').upload(filePath, labelBytes, {
          contentType: 'application/pdf',
          upsert: true,
        });
        if (!fbRes.error) targetBucket = 'shipping-files';
      }

      const { data: signedData } = await supabase.storage
        .from(targetBucket)
        .createSignedUrl(filePath, 604800);

      const publicLabelUrl = getPublicSignedUrl(signedData?.signedUrl) ?? null;

      await supabase.from('order_shipping_files').upsert({
        order_id: ord.id,
        file_name: `etiqueta-${mlOrderIdStr}.pdf`,
        file_path: filePath,
        file_size: labelBytes.byteLength,
        uploaded_at: new Date().toISOString(),
      }, { onConflict: 'order_id,file_path' });

      // Lógica de avanço de status
      const isPaid = ord.payment_status === 'paid' || ord.status === 'pago';
      let nextStatus = ord.status;

      if (isPaid && (ord.status === 'pago' || ord.status === 'pendente')) {
        nextStatus = 'recebido'; // Pedido Pago > Aguardando Envio
        advancedToPaid++;
      }

      await supabase
        .from('orders')
        .update({
          has_shipping_file: true,
          ml_label_url: publicLabelUrl,
          ml_shipment_id: String(shipmentId),
          tracking_code: trackingCode,
          tracking_number: trackingCode,
          shipping_label_status: 'ready',
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ord.id);

      await supabase.from('order_status_history').insert({
        order_id: ord.id,
        status: nextStatus,
        notes: isPaid
          ? `Etiqueta sincronizada automaticamente do Mercado Livre. Pedido pago e pronto para separação/envio.`
          : `Etiqueta sincronizada automaticamente do Mercado Livre. Aguardando confirmação do pagamento Pix do revendedor.`,
      });

      downloaded++;
      console.log(`[ml-order-webhook] ✅ Pedido #${ord.order_number} teve etiqueta sincronizada com sucesso!`);
    } catch (err: any) {
      console.error(`[ml-order-webhook] Erro ao sincronizar etiqueta do pedido #${ord.order_number}:`, err);
      errors.push(`Pedido #${ord.order_number}: ${err.message}`);
    }
  }

  return {
    checked,
    downloaded,
    advancedToPaid,
    notReadyCount,
    errors,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    console.log('[ml-order-webhook] Payload recebido:', JSON.stringify(body));

    // Ação 0: Diagnóstico e inspeção
    if (body.action === 'inspect_orders') {
      let query = supabase
        .from('orders')
        .select('id, order_number, reseller_id, total_amount, payment_status, status, ml_order_id, ml_shipment_id, tracking_code, notes, shipping_address, created_at')
        .order('created_at', { ascending: false });

      if (body.order_id) {
        query = query.eq('id', body.order_id);
      } else if (body.order_number) {
        query = query.eq('order_number', body.order_number);
      } else if (body.reseller_id) {
        query = query.eq('reseller_id', body.reseller_id);
      }

      const { data: ordersData, error: ordersError } = await query.limit(20);

      let itemsData = null;
      if (ordersData && ordersData.length > 0 && (body.order_id || body.order_number)) {
        const { data: its } = await supabase
          .from('order_items')
          .select('*, product:products(*)')
          .eq('order_id', ordersData[0].id);
        itemsData = its;
      }

      let walletData = null;
      if (body.reseller_id) {
        const { data: w } = await supabase.from('wallets').select('*').eq('user_id', body.reseller_id).maybeSingle();
        walletData = w;
      }

      let debugData: any = {};
      if (body.debug_investigate) {
        // 1. Published products for relevant MLB item IDs
        const { data: pubData } = await supabase
          .from('mercadolivre_published_products')
          .select('*, product:products(id, name, sku, cost_price)')
          .in('ml_item_id', ['MLB7603326488', 'MLB5379767281', '7603326488', '5379767281']);
        debugData.published = pubData;

        // 2. Listing variants
        const { data: variantsData } = await supabase
          .from('ml_listing_variants')
          .select('*')
          .in('ml_item_id', ['MLB7603326488', 'MLB5379767281', '7603326488', '5379767281']);
        debugData.variants = variantsData;

        // 3. Search products by keywords
        const { data: bastaoProds } = await supabase
          .from('products')
          .select('id, name, sku, cost_price, supplier_id, supplier_cost_price')
          .or('name.ilike.%bastão%,name.ilike.%bastao%,name.ilike.%desentup%,name.ilike.%silicone%,name.ilike.%air fryer%')
          .limit(20);
        debugData.matching_products = bastaoProds;

        // 4. Products by SKUs
        const { data: skuProds } = await supabase
          .from('products')
          .select('id, name, sku, cost_price, supplier_id')
          .in('sku', ['LJFADM000197', 'LJFADM000140']);
        debugData.sku_products = skuProds;

        // 5. ML API check for orders
        const testOrders = ['2000019411133852', '2000019409877076', '2000015928621835', '2000015927574317'];
        const mlOrdersFound: any[] = [];
        for (const tOrd of testOrders) {
          const sInfo = await findSellerForOrder(tOrd, body.reseller_id || '2640edf0-819c-4f2f-89c7-c459dcf00413');
          if (sInfo && sInfo.mlOrder) {
            mlOrdersFound.push({
              searched_id: tOrd,
              found_order_id: sInfo.mlOrder.id,
              pack_id: sInfo.mlOrder.pack_id,
              status: sInfo.mlOrder.status,
              total_amount: sInfo.mlOrder.total_amount,
              order_items: (sInfo.mlOrder.order_items || []).map((oi: any) => ({
                item_id: oi.item?.id,
                title: oi.item?.title,
                seller_sku: oi.item?.seller_sku,
                seller_custom_field: oi.item?.seller_custom_field,
                variation_attributes: oi.item?.variation_attributes,
                quantity: oi.quantity,
                unit_price: oi.unit_price,
              }))
            });
          }
        }
        debugData.ml_orders = mlOrdersFound;
      }

      return new Response(JSON.stringify({
        success: true,
        orders: ordersData,
        items: itemsData,
        wallet: walletData,
        debug: debugData,
        error: ordersError,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação Especial: Correção cirúrgica de pedidos com vinculação incorreta de produtos (909, 910, 911)
    if (body.action === 'fix_mismatched_orders') {
      const BASTAO_PROD_ID = 'eade0422-8f3f-41f5-9b25-ab56d64ae8c4'; // Limpador E Desentupidor De Pias Ralos, SKU LJFADM000194, Custo R$ 6.00
      const SILICONE_PROD_ID = 'db0bcf41-21bb-4cb2-9695-507858797243'; // Forma Airfryer Silicone Redonda, SKU LJFADM000147, Custo R$ 5.00
      const RESELLER_ID = body.reseller_id || '2640edf0-819c-4f2f-89c7-c459dcf00413';

      const { data: prodBastao } = await supabase.from('products').select('*').eq('id', BASTAO_PROD_ID).single();
      const { data: prodSilicone } = await supabase.from('products').select('*').eq('id', SILICONE_PROD_ID).single();

      // 1. Atualizar mapeamentos oficiais de MLB7603326488 e MLB5379767281 no banco
      await supabase.from('mercadolivre_published_products').upsert([
        {
          user_id: RESELLER_ID,
          product_id: BASTAO_PROD_ID,
          ml_item_id: 'MLB7603326488',
          status: 'published',
          published_at: new Date().toISOString()
        },
        {
          user_id: RESELLER_ID,
          product_id: SILICONE_PROD_ID,
          ml_item_id: 'MLB5379767281',
          status: 'published',
          published_at: new Date().toISOString()
        }
      ], { onConflict: 'user_id,ml_item_id' });

      await supabase.from('ml_listing_variants').update({
        product_id: BASTAO_PROD_ID,
        sku: 'LJFADM000194'
      }).eq('ml_item_id', 'MLB7603326488');

      await supabase.from('ml_listing_variants').update({
        product_id: SILICONE_PROD_ID,
        sku: 'LJFADM000147'
      }).eq('ml_item_id', 'MLB5379767281');

      // Tentar atualizar seller_custom_field no Mercado Livre via API
      let mlUpdateLog: any = {};
      try {
        const { data: intg } = await supabase
          .from('mercadolivre_integrations')
          .select('user_id, ml_user_id, access_token, refresh_token, expires_at')
          .eq('user_id', RESELLER_ID)
          .eq('is_active', true)
          .maybeSingle();

        if (intg) {
          const token = await getValidTokenForIntegration(intg);
          const r1 = await fetch('https://api.mercadolibre.com/items/MLB7603326488', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ seller_custom_field: 'LJFADM000194' })
          });
          mlUpdateLog.bastao = { status: r1.status, body: await r1.json().catch(() => ({})) };

          const r2 = await fetch('https://api.mercadolibre.com/items/MLB5379767281', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ seller_custom_field: 'LJFADM000147' })
          });
          mlUpdateLog.silicone = { status: r2.status, body: await r2.json().catch(() => ({})) };
        }
      } catch (mlErr: any) {
        mlUpdateLog.error = mlErr.message;
      }

      const results: any[] = [];

      // 2. Corrigir Pedidos 910 e 911 (Limpador e Desentupidor de Pias Ralos)
      for (const ordNum of ['910', '911']) {
        const { data: ord } = await supabase.from('orders').select('*').eq('order_number', ordNum).maybeSingle();
        if (ord) {
          // Atualizar item do pedido
          await supabase.from('order_items').delete().eq('order_id', ord.id);
          await supabase.from('order_items').insert({
            order_id: ord.id,
            product_id: BASTAO_PROD_ID,
            quantity: 1,
            unit_price: 39,
            total_price: 39,
            supplier_id: prodBastao.supplier_id,
            supplier_organization_id: prodBastao.supplier_organization_id,
            supplier_unit_cost: 6,
            supplier_total_cost: 6,
            reseller_margin_amount: 33,
            platform_fee_amount: 0,
            supplier_net_amount: 6,
            financials_frozen_at: new Date().toISOString(),
            product_snapshot: {
              name: prodBastao.name,
              sku: prodBastao.sku,
              ml_item_id: 'MLB7603326488',
              cost_price: 6,
              image_url: prodBastao.image_url || prodBastao.images?.[0] || null,
            }
          });

          // Verificar se já houve estorno prévio para evitar estorno duplicado
          const { data: existingRefund } = await supabase
            .from('wallet_transactions')
            .select('id')
            .eq('referencia_id', ord.id)
            .eq('tipo', 'estorno')
            .maybeSingle();

          let refundAmount = 0;
          let newBal = 0;
          if (!existingRefund) {
            refundAmount = 19.00; // debitado R$ 25.00, custo real R$ 6.00
            const { data: w } = await supabase.from('wallets').select('id, saldo').eq('user_id', ord.reseller_id).single();
            const currentBal = Number(w.saldo);
            newBal = Math.round((currentBal + refundAmount) * 100) / 100;

            await supabase.from('wallets').update({ saldo: newBal }).eq('user_id', ord.reseller_id);

            await supabase.from('wallet_transactions').insert({
              wallet_id: w.id,
              tipo: 'estorno',
              valor: refundAmount,
              saldo_anterior: currentBal,
              saldo_posterior: newBal,
              descricao: `Reembolso de diferença de custo: Pedido #${ord.order_number} corrigido para "${prodBastao.name}" (Custo corrigido de R$ 25.00 para R$ 6.00)`,
              referencia_tipo: 'order',
              referencia_id: ord.id,
              status: 'completed',
            });
          }

          // Atualizar notes do pedido
          const updatedNotes = ord.notes
            ? ord.notes.replace(/Custo Fornecedor: R\$ [0-9.]+/g, 'Custo Fornecedor: R$ 6.00').replace(/Abate Carteira: R\$ [0-9.]+/g, 'Abate Carteira: R$ 6.00')
            : `Pedido via Mercado Livre. Custo Fornecedor: R$ 6.00 | Abate Carteira: R$ 6.00 | Pix 24h: R$ 0.00`;

          await supabase.from('orders').update({ notes: updatedNotes }).eq('id', ord.id);
          results.push({ order_number: ordNum, product: prodBastao.name, refunded: refundAmount, new_balance: newBal });
        }
      }

      // 3. Corrigir Pedido 909 (Forma Airfryer Silicone Redonda)
      const { data: ord909 } = await supabase.from('orders').select('*').eq('order_number', '909').maybeSingle();
      if (ord909) {
        await supabase.from('order_items').delete().eq('order_id', ord909.id);
        await supabase.from('order_items').insert({
          order_id: ord909.id,
          product_id: SILICONE_PROD_ID,
          quantity: 2,
          unit_price: 21.99,
          total_price: 43.98,
          supplier_id: prodSilicone.supplier_id,
          supplier_organization_id: prodSilicone.supplier_organization_id,
          supplier_unit_cost: 5,
          supplier_total_cost: 10,
          reseller_margin_amount: 33.98,
          platform_fee_amount: 0,
          supplier_net_amount: 10,
          financials_frozen_at: new Date().toISOString(),
          product_snapshot: {
            name: prodSilicone.name,
            sku: prodSilicone.sku,
            ml_item_id: 'MLB5379767281',
            cost_price: 5,
            image_url: prodSilicone.image_url || prodSilicone.images?.[0] || null,
          }
        });

        const { data: existingRefund909 } = await supabase
          .from('wallet_transactions')
          .select('id')
          .eq('referencia_id', ord909.id)
          .eq('tipo', 'estorno')
          .maybeSingle();

        let refundAmount909 = 0;
        let newBal909 = 0;
        if (!existingRefund909) {
          refundAmount909 = 56.00; // debitado R$ 66.00, custo real R$ 10.00
          const { data: w } = await supabase.from('wallets').select('id, saldo').eq('user_id', ord909.reseller_id).single();
          const currentBal = Number(w.saldo);
          newBal909 = Math.round((currentBal + refundAmount909) * 100) / 100;

          await supabase.from('wallets').update({ saldo: newBal909 }).eq('user_id', ord909.reseller_id);

          await supabase.from('wallet_transactions').insert({
            wallet_id: w.id,
            tipo: 'estorno',
            valor: refundAmount909,
            saldo_anterior: currentBal,
            saldo_posterior: newBal909,
            descricao: `Reembolso de diferença de custo: Pedido #909 corrigido para "${prodSilicone.name}" (Custo corrigido de R$ 66.00 para R$ 10.00)`,
            referencia_tipo: 'order',
            referencia_id: ord909.id,
            status: 'completed',
          });
        }

        const updatedNotes909 = ord909.notes
          ? ord909.notes.replace(/Custo Fornecedor: R\$ [0-9.]+/g, 'Custo Fornecedor: R$ 10.00').replace(/Abate Carteira: R\$ [0-9.]+/g, 'Abate Carteira: R$ 10.00')
          : `Pedido via Mercado Livre. Custo Fornecedor: R$ 10.00 | Abate Carteira: R$ 10.00 | Pix 24h: R$ 0.00`;

        await supabase.from('orders').update({ notes: updatedNotes909 }).eq('id', ord909.id);
        results.push({ order_number: '909', product: prodSilicone.name, refunded: refundAmount909, new_balance: newBal909 });
      }

      return new Response(JSON.stringify({ success: true, results, ml_update: mlUpdateLog }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação: Limpeza completa das comissões indevidas e reversão de pedidos pagos com saldo fantasma
    if (body.action === 'cleanup_phantom_commissions') {
      const resellerUserId = body.reseller_id || '2640edf0-819c-4f2f-89c7-c459dcf00413';

      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', resellerUserId)
        .maybeSingle();

      if (!wallet) {
        return new Response(JSON.stringify({ error: 'Carteira não encontrada' }), { status: 404, headers: corsHeaders });
      }

      // 1. Excluir todas as transações fantasmas de comissão, estorno temporário e pagamentos com saldo fantasma
      const { data: phantomTxs } = await supabase
        .from('wallet_transactions')
        .select('id, tipo, valor, descricao')
        .eq('wallet_id', wallet.id)
        .or('descricao.ilike.%Comissão de venda%,descricao.ilike.%Reembolso de diferença de custo%,descricao.ilike.%Pagamento integral de pedido Mercado Livre%,descricao.ilike.%Abate parcial via carteira%');

      const phantomCount = phantomTxs?.length || 0;
      let phantomTotalCredit = 0;
      let phantomTotalDebit = 0;

      for (const pt of phantomTxs || []) {
        if (pt.tipo === 'cashback' || pt.tipo === 'estorno' || pt.tipo === 'recarga') {
          phantomTotalCredit += Number(pt.valor);
        } else {
          phantomTotalDebit += Number(pt.valor);
        }
      }

      if (phantomCount > 0) {
        const idsToDelete = phantomTxs!.map(t => t.id);
        for (let i = 0; i < idsToDelete.length; i += 100) {
          const slice = idsToDelete.slice(i, i + 100);
          await supabase.from('wallet_transactions').delete().in('id', slice);
        }
      }

      // 2. Calcular saldo real remanescente a partir de transações legítimas
      const { data: remainingTxs } = await supabase
        .from('wallet_transactions')
        .select('tipo, valor')
        .eq('wallet_id', wallet.id);

      let realBalance = 0;
      for (const t of remainingTxs || []) {
        if (t.tipo === 'recarga' || t.tipo === 'estorno') {
          realBalance += Number(t.valor);
        } else if (t.tipo === 'debito' || t.tipo === 'saque') {
          realBalance -= Number(t.valor);
        }
      }
      realBalance = Math.max(0, Math.round(realBalance * 100) / 100);

      await supabase.from('wallets').update({
        saldo: realBalance,
        saldo_bloqueado: 0,
        saldo_reservado_saque: 0,
        updated_at: new Date().toISOString(),
      }).eq('id', wallet.id);

      // 3. Buscar perfil e e-mail do revendedor para gerar os Pix
      const { data: resellerProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, cpf, phone')
        .eq('user_id', resellerUserId)
        .maybeSingle();

      let resellerEmail: string | null = null;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(resellerUserId);
        resellerEmail = authUser?.user?.email ?? null;
      } catch {}

      // 4. Reverter pedidos que foram marcados como pagos indevidamente (#909, #910, #911)
      const targetOrderNumbers = ['909', '910', '911'];
      const revertedOrders: any[] = [];

      for (const ordNum of targetOrderNumbers) {
        const { data: ord } = await supabase
          .from('orders')
          .select('*, items:order_items(*)')
          .eq('order_number', ordNum)
          .maybeSingle();

        if (ord) {
          const items = ord.items || [];
          let totalSupplierCost = 0;
          const itemsForPix: any[] = [];

          for (const it of items) {
            const cost = Number(it.supplier_total_cost ?? (it.supplier_unit_cost * it.quantity) ?? 0);
            totalSupplierCost += cost;
            itemsForPix.push({
              productId: it.product_id,
              name: it.product_snapshot?.name || 'Item do pedido',
              quantity: it.quantity,
              costPrice: Number(it.supplier_unit_cost ?? 0),
            });
          }

          totalSupplierCost = Math.round(totalSupplierCost * 100) / 100;

          // Gerar Pix de 24h real
          let pixData: any = { qrCode: null, qrCodeBase64: null, paymentId: `ml_pay_${ord.order_number}`, expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString() };
          try {
            pixData = await generatePix24h({
              orderNumber: ord.order_number,
              amount: totalSupplierCost,
              description: `Pagamento de fulfillment do Pedido #${ord.order_number}`,
              resellerUserId: ord.reseller_id,
              resellerProfile,
              resellerEmail,
              items: itemsForPix,
              mlOrderId: ord.ml_order_id,
              walletDeducted: 0,
              totalCost: totalSupplierCost,
            });
          } catch (pixErr: any) {
            console.warn(`[ml-order-webhook] Erro ao gerar Pix no cleanup para #${ord.order_number}:`, pixErr.message);
          }

          const updatedNotes = `Pedido via Mercado Livre #${ord.ml_order_id}. Custo Fornecedor: R$ ${totalSupplierCost.toFixed(2)} | Abate Carteira: R$ 0.00 | Pix 24h: R$ ${totalSupplierCost.toFixed(2)} (Aguardando pagamento)`;

          await supabase.from('orders').update({
            payment_status: 'pending',
            status: 'pendente',
            pix_qr_code: pixData.qrCode,
            pix_qr_code_base64: pixData.qrCodeBase64,
            payment_id: pixData.paymentId,
            payment_expires_at: pixData.expiresAt,
            notes: updatedNotes,
            updated_at: new Date().toISOString(),
          }).eq('id', ord.id);

          await supabase.from('order_status_history').insert({
            order_id: ord.id,
            status: 'pendente',
            notes: `Status revertido para Pendente — cobrança Pix de R$ ${totalSupplierCost.toFixed(2)} gerada para pagamento de fulfillment`,
            created_at: new Date().toISOString(),
          });

          revertedOrders.push({
            order_number: ord.order_number,
            status: 'pendente',
            payment_status: 'pending',
            total_supplier_cost: totalSupplierCost,
            has_pix_qr_code: !!pixData.qrCode,
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        phantom_transactions_deleted: phantomCount,
        phantom_credits_removed: phantomTotalCredit,
        phantom_debits_removed: phantomTotalDebit,
        real_wallet_balance: realBalance,
        reverted_orders: revertedOrders,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação 1: Sincronização manual dos pedidos de um revendedor específico
    if (body.action === 'sync_reseller_orders' && body.user_id) {
      try {
        const summary = await syncResellerRecentOrders(body.user_id);
        return new Response(JSON.stringify({ success: true, summary }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (syncErr: any) {
        console.warn(`[ml-order-webhook] Aviso na sincronização do usuário ${body.user_id}:`, syncErr.message);
        return new Response(JSON.stringify({
          success: false,
          not_connected: syncErr.message.includes('não encontrada') || syncErr.message.includes('inativa'),
          error: syncErr.message,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Ação 2: Sincronização em lote de todas as contas ativas (Cron ou Super Admin)
    if (body.action === 'sync_all_recent_orders' || body.mode === 'sync_all_recent_orders') {
      try {
        const summary = await syncAllRecentOrders();
        return new Response(JSON.stringify({ success: true, summary }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (allErr: any) {
        return new Response(JSON.stringify({ success: false, error: allErr.message }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Ação 3: Importação direta por ID de pedido
    if (body.action === 'process_order' || (body.order_id && !body.action)) {
      const targetOrderId = String(body.order_id || body.ml_order_id);
      const result = await processSingleMlOrder(targetOrderId, body.user_id);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação 4: Reparar pedidos de um revendedor ou pedido específico
    if (body.action === 'repair_orders') {
      if (body.order_id) {
        const { data: ord } = await supabase.from('orders').select('*').eq('id', body.order_id).maybeSingle();
        if (ord) {
          await repairExistingOrder(ord, ord.reseller_id);
          return new Response(JSON.stringify({ success: true, repaired: 1 }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
      if (body.user_id) {
        const { data: userOrders } = await supabase
          .from('orders')
          .select('*')
          .eq('reseller_id', body.user_id)
          .not('ml_order_id', 'is', null)
          .limit(5);

        let repaired = 0;
        for (const ord of userOrders || []) {
          await repairExistingOrder(ord, body.user_id);
          repaired++;
        }

        return new Response(JSON.stringify({ success: true, repaired }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Ação 4.5: Sincronização periódica ou sob demanda de etiquetas pendentes do Mercado Livre
    if (body.action === 'sync_pending_labels' || body.mode === 'sync_pending_labels') {
      try {
        const result = await syncPendingLabels({
          resellerUserId: body.user_id,
          orderId: body.order_id,
        });
        return new Response(JSON.stringify({ success: true, result }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (labelSyncErr: any) {
        return new Response(JSON.stringify({ success: false, error: labelSyncErr.message }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Ação 5: Gerar Pix de fulfillment sob demanda para um pedido
    if (body.action === 'generate_pix_for_order' && body.order_id) {
      const { data: orderToPix } = await supabase
        .from('orders')
        .select('*')
        .eq('id', body.order_id)
        .maybeSingle();

      if (!orderToPix) {
        return new Response(JSON.stringify({ success: false, error: 'Pedido não encontrado.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (orderToPix.pix_qr_code) {
        return new Response(JSON.stringify({
          success: true,
          pix_qr_code: orderToPix.pix_qr_code,
          pix_qr_code_base64: orderToPix.pix_qr_code_base64,
          payment_expires_at: orderToPix.payment_expires_at,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderToPix.id);

      let totalCost = 0;
      for (const it of orderItems || []) {
        totalCost += Number(it.supplier_total_cost || it.total_price || 0);
      }
      if (totalCost <= 0) totalCost = Number(orderToPix.total_amount || 0);

      const { data: resellerProfile } = await supabase.from('profiles').select('first_name, last_name, cpf, phone').eq('user_id', orderToPix.reseller_id).maybeSingle();
      let resellerEmail = null;
      try {
        const { data: authUser } = await supabase.auth.admin.getUserById(orderToPix.reseller_id);
        resellerEmail = authUser?.user?.email ?? null;
      } catch {}

      const pixRes = await generatePix24h({
        orderNumber: orderToPix.order_number,
        amount: totalCost,
        description: `Fulfillment Pedido #${orderToPix.order_number}`,
        resellerUserId: orderToPix.reseller_id,
        resellerProfile,
        resellerEmail,
        items: orderItems || [],
        mlOrderId: orderToPix.ml_order_id || orderToPix.order_number,
        walletDeducted: 0,
        totalCost,
      });

      await supabase.from('orders').update({
        pix_qr_code: pixRes.qrCode,
        pix_qr_code_base64: pixRes.qrCodeBase64,
        payment_expires_at: pixRes.expiresAt,
        payment_method: 'pix',
        payment_status: 'pending',
      }).eq('id', orderToPix.id);

      return new Response(JSON.stringify({
        success: true,
        pix_qr_code: pixRes.qrCode,
        pix_qr_code_base64: pixRes.qrCodeBase64,
        payment_expires_at: pixRes.expiresAt,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ação 6: Limpar pedidos duplicados, estornar carteira e importar pedido pendente do ML
    if (body.action === 'clean_duplicates_and_refund') {
      console.log('[ml-order-webhook] Executando limpeza de pedidos duplicados e estorno de carteira...');

      // 1. Localizar pedidos duplicados de 2000019284106296
      const { data: allDuplicates } = await supabase
        .from('orders')
        .select('id, order_number, reseller_id, created_at, notes')
        .or('ml_order_id.eq.2000019284106296,notes.ilike.%#2000019284106296%')
        .order('created_at', { ascending: true });

      const deletedOrders: any[] = [];
      let refundedTotal = 0;
      const resellerUserId = allDuplicates?.[0]?.reseller_id || '2640edf0-819c-4f2f-89c7-c459dcf00413';

      if (allDuplicates && allDuplicates.length > 1) {
        // Manter o original (index 0: #890) e deletar os duplicados subsequentes
        const duplicatesToDelete = allDuplicates.slice(1);
        for (const dup of duplicatesToDelete) {
          await supabase.from('order_items').delete().eq('order_id', dup.id);
          await supabase.from('order_shipping_files').delete().eq('order_id', dup.id);
          await supabase.from('order_status_history').delete().eq('order_id', dup.id);
          await supabase.from('orders').delete().eq('id', dup.id);
          deletedOrders.push(dup.order_number);
          refundedTotal += 16.40;
        }

        // Estornar carteira da revendedora
        if (refundedTotal > 0 && resellerUserId) {
          const { data: w } = await supabase.from('wallets').select('*').eq('user_id', resellerUserId).maybeSingle();
          if (w) {
            const currentBal = Number(w.saldo || 0);
            const newBal = Math.round((currentBal + refundedTotal) * 100) / 100;
            await supabase.from('wallets').update({ saldo: newBal, updated_at: new Date().toISOString() }).eq('id', w.id);
            await supabase.from('wallet_transactions').insert({
              wallet_id: w.id,
              tipo: 'estorno',
              valor: refundedTotal,
              taxa: 0,
              valor_pago: refundedTotal,
              saldo_anterior: currentBal,
              saldo_posterior: newBal,
              descricao: `Estorno de ${deletedOrders.length} cobranças duplicadas do pedido ML #2000019284106296 (Pedidos #${deletedOrders.join(', #')})`,
              referencia_tipo: 'order',
              status: 'completed',
            });
          }
        }
      }

      // 2. Importar o pedido pendente do print #2000015837503663 (Hissao Saito)
      let hissaoResult = null;
      try {
        hissaoResult = await processSingleMlOrder('2000015837503663', resellerUserId);
      } catch (hErr: any) {
        hissaoResult = { success: false, error: hErr.message };
      }

      // Garantir que a referência exibida seja o ID da venda/pack do ML (2000015837503663)
      await supabase
        .from('orders')
        .update({ ml_order_id: '2000015837503663' })
        .eq('id', 'ee95cba6-472a-45fd-aa84-e910a461cd9a');

      return new Response(JSON.stringify({
        success: true,
        deleted_orders: deletedOrders,
        refunded_total: refundedTotal,
        hissao_order: hissaoResult,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { topic, resource, user_id: mlUserId, seller_id: sellerId } = body;

    if (!topic || !resource) {
      return new Response(JSON.stringify({ ok: true, message: 'Ping recebido' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (topic === 'shipments') {
      const shipmentIdMatch = resource.match(/\/shipments\/(\d+)/);
      if (shipmentIdMatch) {
        const shipmentId = shipmentIdMatch[1];
        console.log(`[ml-order-webhook] Recebido tópico shipments #${shipmentId}. Buscando pedido associado...`);
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

    if (topic !== 'orders_v2' && topic !== 'orders') {
      console.log('[ml-order-webhook] Ignorando tópico:', topic);
      return new Response(JSON.stringify({ ok: true, ignored_topic: topic }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
