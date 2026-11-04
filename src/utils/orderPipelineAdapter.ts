import { OrderPipelineItem } from "@/types/orderPipeline";

export function normalizeOrderToPipelineItem(
  order: any,
  context?: {
    profilesMap?: Map<string, any>;
    supplierOrgsMap?: Map<string, any>;
    ticketsMap?: Map<string, any>;
  }
): OrderPipelineItem {
  const profilesMap = context?.profilesMap;
  const supplierOrgsMap = context?.supplierOrgsMap;
  const ticketsMap = context?.ticketsMap;

  // External reference
  const externalRef =
    order.external_reference ||
    order.marketplace_order_id ||
    order.ml_order_id ||
    null;

  // Tracking
  const trackingNumber =
    order.tracking_number ||
    order.tracking_code ||
    null;

  // Channel determination
  let channel = (order.marketplace || "").toLowerCase();
  let channelLabel = "Lojafy";
  if (channel.includes("mercado") || order.ml_order_id || order.ml_shipment_id) {
    channel = "mercadolivre";
    channelLabel = "ML";
  } else if (channel.includes("shopee")) {
    channel = "shopee";
    channelLabel = "Shopee";
  } else if (channel.includes("manual")) {
    channel = "manual";
    channelLabel = "Manual";
  } else if (channel) {
    channelLabel = channel.toUpperCase();
  }

  // Origin type
  const originType: "AUTO" | "MANUAL" =
    externalRef || order.ml_order_id || order.ml_shipment_id || order.origin_type === "auto"
      ? "AUTO"
      : "MANUAL";

  // Products
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  let mainProduct = undefined;
  let totalQuantity = 0;

  if (items.length > 0) {
    const first = items[0];
    const snapshot = first.product_snapshot || {};
    const prod = first.product || {};
    
    // Extract thumbnail
    let img =
      snapshot.image ||
      snapshot.images?.[0] ||
      prod.images?.[0] ||
      prod.image ||
      null;

    if (!img && Array.isArray(prod.original_images) && prod.original_images.length > 0) {
      img = prod.original_images[0]?.url || prod.original_images[0];
    }

    mainProduct = {
      id: first.product_id,
      name: snapshot.name || prod.name || prod.title || "Produto",
      imageUrl: img,
      quantity: first.quantity || 1,
    };

    totalQuantity = items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);
  } else {
    // Fallback if no order_items joined
    mainProduct = {
      name: order.product_name || "Item do Pedido",
      imageUrl: order.product_image || undefined,
      quantity: order.items_count || 1,
    };
    totalQuantity = order.items_count || 1;
  }

  // Seller resolution
  let sellerName = "Lojafy";
  if (order.reseller_id && profilesMap?.has(order.reseller_id)) {
    const p = profilesMap.get(order.reseller_id);
    sellerName = p.business_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Revendedor";
  } else if (order.reseller?.profiles?.business_name) {
    sellerName = order.reseller.profiles.business_name;
  } else if (order.reseller_profile) {
    const p = order.reseller_profile;
    sellerName = p.business_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Revendedor";
  }

  // Customer resolution
  let customerName = "Cliente";
  if (order.user_id && profilesMap?.has(order.user_id)) {
    const p = profilesMap.get(order.user_id);
    customerName = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Cliente";
  } else if (order.profiles) {
    customerName = `${order.profiles.first_name || ""} ${order.profiles.last_name || ""}`.trim() || "Cliente";
  } else if (order.shipping_address) {
    const addr = typeof order.shipping_address === "string"
      ? JSON.parse(order.shipping_address || "{}")
      : order.shipping_address;
    if (addr.name || addr.receiver_name) {
      customerName = addr.name || addr.receiver_name;
    }
  }

  // Supplier resolution
  let supplierName = "Fornecedor Nacional";
  const firstItem = items[0];
  const supplierOrgId = firstItem?.supplier_organization_id || order.supplier_organization_id;
  const supplierId = firstItem?.supplier_id || order.supplier_id;

  if (supplierOrgId && supplierOrgsMap?.has(supplierOrgId)) {
    const org = supplierOrgsMap.get(supplierOrgId);
    supplierName = org.trade_name || org.name || "Fornecedor";
  } else if (supplierId && profilesMap?.has(supplierId)) {
    const sp = profilesMap.get(supplierId);
    supplierName = sp.business_name || `${sp.first_name || ""} ${sp.last_name || ""}`.trim() || "Fornecedor";
  } else if (order.supplier_name) {
    supplierName = order.supplier_name;
  }

  // Tickets / Occurrences
  const activeTicket = ticketsMap?.get(order.id);

  return {
    id: order.id,
    order_number: order.order_number ? String(order.order_number).replace(/^#/, "") : "",
    created_at: order.created_at,
    status: order.status || "pendente",
    payment_status: order.payment_status || "pending",
    total_amount: Number(order.total_amount) || 0,
    external_reference: externalRef,
    tracking_number: trackingNumber,
    channel,
    channel_label: channelLabel,
    origin_type: originType,
    main_product: mainProduct,
    total_items_count: items.length > 0 ? items.length : 1,
    total_quantity_count: totalQuantity,
    seller_name: sellerName,
    customer_name: customerName,
    supplier_name: supplierName,
    pix_qr_code: order.pix_qr_code,
    pix_qr_code_base64: order.pix_qr_code_base64,
    payment_expires_at: order.payment_expires_at,
    has_shipping_file: !!(order.has_shipping_file || order.ml_label_url || order.shipping_label_status === "ready"),
    ml_label_url: order.ml_label_url,
    shipping_label_status: order.shipping_label_status,
    active_ticket_status: activeTicket?.status || null,
    active_ticket_type: activeTicket?.tipo || null,
    active_ticket_id: activeTicket?.id || null,
    has_solicitation: !!(order.cancelamento_motivo || order.devolucao_motivo),
    solicitation_type: order.cancelamento_motivo ? "cancelamento" : order.devolucao_motivo ? "devolucao" : null,
    raw: order,
  };
}
