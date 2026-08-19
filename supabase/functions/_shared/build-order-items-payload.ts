// Shared utility to build enriched order item payload for webhooks.
// Adds main image url, cost price and selected variation (when applicable).

interface OrderItemInput {
  product_id: string;
  quantity: number;
  unit_price: number;
  product_snapshot?: any;
}

interface VariationOutput {
  name?: string | null;
  sku?: string | null;
  attributes?: Record<string, any> | null;
  price?: number | null;
  cost_price?: number | null;
  image?: string | null;
}

export interface SupplierInfo {
  id: string;
  trade_name: string | null;
  legal_name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
}

interface EnrichedItem {
  product_id: string;
  product_url: string;
  name: string;
  sku: string | null;
  image_url: string | null;
  cost_price: number | null;
  quantity: number;
  unit_price: number;
  variation: VariationOutput | null;
  supplier?: SupplierInfo | null;
}

function normalize(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function detectVariation(
  product: any,
  snapshot: any
): VariationOutput | null {
  if (!product?.has_variations) return null;
  const variations = Array.isArray(product?.variations) ? product.variations : null;
  if (!variations || variations.length === 0) return null;

  const snapshotName: string = snapshot?.name || '';
  const snapshotSku: string | null = snapshot?.sku || null;

  // Strategy 1: match by SKU (most reliable)
  if (snapshotSku) {
    const bySku = variations.find(
      (v: any) => v?.sku && normalize(v.sku) === normalize(snapshotSku)
    );
    if (bySku) return mapVariation(bySku);
  }

  // Strategy 2: parse "Product - VariantName" suffix and match by variation name
  if (snapshotName && product?.name) {
    const baseName = normalize(product.name);
    const fullName = normalize(snapshotName);
    if (fullName !== baseName && fullName.startsWith(baseName)) {
      // Suffix after base product name
      const suffix = snapshotName.substring(product.name.length).replace(/^\s*-\s*/, '').trim();
      if (suffix) {
        const suffixNorm = normalize(suffix);
        const byName = variations.find(
          (v: any) => v?.name && normalize(v.name) === suffixNorm
        );
        if (byName) return mapVariation(byName);
        // Fallback: match by attribute values joined
        const byAttrs = variations.find((v: any) => {
          if (!v?.attributes || typeof v.attributes !== 'object') return false;
          const joined = normalize(Object.values(v.attributes).join(' '));
          return joined === suffixNorm;
        });
        if (byAttrs) return mapVariation(byAttrs);
      }
    }
    // Strategy 3: try last "- xxx" segment
    const parts = snapshotName.split(' - ');
    if (parts.length > 1) {
      const last = normalize(parts[parts.length - 1]);
      const byLast = variations.find(
        (v: any) => v?.name && normalize(v.name) === last
      );
      if (byLast) return mapVariation(byLast);
    }
  }

  return null;
}

function mapVariation(v: any): VariationOutput {
  return {
    name: v?.name ?? null,
    sku: v?.sku ?? null,
    attributes: v?.attributes ?? null,
    price: v?.price ?? v?.priceModifier ?? null,
    cost_price: v?.cost_price ?? v?.costPrice ?? null,
    image: v?.image ?? v?.image_url ?? null,
  };
}

export async function buildOrderItemsPayload(
  supabase: any,
  orderItems: OrderItemInput[] | null | undefined
): Promise<EnrichedItem[]> {
  if (!orderItems || orderItems.length === 0) return [];

  const baseUrl = (Deno.env.get('PUBLIC_SITE_URL') || 'https://lojafy.app').replace(/\/$/, '');

  const productIds = Array.from(
    new Set(orderItems.map((i) => i.product_id).filter(Boolean))
  );

  let productsMap = new Map<string, any>();
  let suppliersMap = new Map<string, any>();

  if (productIds.length > 0) {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, sku, image_url, main_image_url, cost_price, has_variations, variations, supplier_organization_id')
      .in('id', productIds);

    if (error) {
      console.error('[build-order-items-payload] erro buscando produtos:', error.message);
    } else if (products) {
      for (const p of products) productsMap.set(p.id, p);

      const orgIds = [...new Set(products.map((p: any) => p.supplier_organization_id).filter(Boolean))];
      if (orgIds.length > 0) {
        const { data: orgs, error: orgsError } = await supabase
          .from('supplier_organizations')
          .select('id, trade_name, legal_name, email, phone, document')
          .in('id', orgIds);

        if (orgsError) {
          console.error('[build-order-items-payload] erro buscando suppliers:', orgsError.message);
        } else if (orgs) {
          for (const org of orgs) suppliersMap.set(org.id, org);
        }
      }
    }
  }

  return orderItems.map((item) => {
    const product = productsMap.get(item.product_id);
    const snapshot = item.product_snapshot || {};

    const variation = detectVariation(product, snapshot);

    const imageUrl =
      product?.main_image_url ||
      product?.image_url ||
      snapshot?.image_url ||
      variation?.image ||
      null;

    const costPrice =
      (typeof product?.cost_price === 'number' ? product.cost_price : null) ??
      (typeof snapshot?.cost_price === 'number' ? snapshot.cost_price : null) ??
      variation?.cost_price ??
      null;

    const orgId = product?.supplier_organization_id;
    const org = orgId ? suppliersMap.get(orgId) : null;

    let supplier: SupplierInfo | null = null;
    if (org) {
      supplier = {
        id: org.id,
        trade_name: org.trade_name,
        legal_name: org.legal_name,
        email: org.email,
        phone: org.phone,
        document: org.document
      };
    }

    return {
      product_id: item.product_id,
      product_url: `${baseUrl}/produto/${item.product_id}`,
      name: snapshot?.name || product?.name || 'Produto',
      sku: snapshot?.sku || product?.sku || null,
      image_url: imageUrl,
      cost_price: costPrice,
      quantity: item.quantity,
      unit_price: item.unit_price,
      variation,
      supplier,
    };
  });
}
