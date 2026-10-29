export interface MarketplaceActionLink {
  marketplace: string; // 'mercadolivre' | 'shopee' | 'amazon' | 'other'
  name: string; // 'Mercado Livre' | 'Shopee' | 'Amazon' | 'Marketplace'
  url: string;
  badgeIcon?: string;
  itemId?: string | null;
}

/**
 * Retorna os links diretos para os anúncios de marketplaces em que o produto está integrado
 * (Mercado Livre, Shopee, Amazon, etc.).
 */
export const getProductMarketplaceLinks = (
  product: any,
  allAds: any[] = [],
  publishedProducts: any[] = []
): MarketplaceActionLink[] => {
  if (!product) return [];
  const links: MarketplaceActionLink[] = [];
  const seenUrls = new Set<string>();

  const addLink = (rawUrl: string | null | undefined, rawMkp?: string | null, itemId?: string | null) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    const url = rawUrl.trim();
    if (!url || !url.startsWith('http') || seenUrls.has(url.toLowerCase())) return;
    seenUrls.add(url.toLowerCase());

    const lowerUrl = url.toLowerCase();
    let mkpKey = (rawMkp || '').toLowerCase().trim();

    if (!mkpKey) {
      if (lowerUrl.includes('mercadolivre.com') || lowerUrl.includes('mercadolibre.com')) mkpKey = 'mercadolivre';
      else if (lowerUrl.includes('shopee.com')) mkpKey = 'shopee';
      else if (lowerUrl.includes('amazon.com')) mkpKey = 'amazon';
      else mkpKey = 'other';
    }

    let name = 'Marketplace';
    let badgeIcon: string | undefined = undefined;

    if (mkpKey === 'mercadolivre' || mkpKey === 'mercado_livre' || mkpKey === 'ml') {
      name = 'Mercado Livre';
      badgeIcon = 'https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png';
    } else if (mkpKey === 'shopee') {
      name = 'Shopee';
      badgeIcon = 'https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png';
    } else if (mkpKey === 'amazon') {
      name = 'Amazon';
    }

    links.push({
      marketplace: mkpKey,
      name,
      url,
      badgeIcon,
      itemId
    });
  };

  // 1. Verificar registros em product_marketplace_data
  if (Array.isArray(product.product_marketplace_data)) {
    product.product_marketplace_data.forEach((mkp: any) => {
      if (mkp.listing_url) {
        addLink(mkp.listing_url, mkp.marketplace, mkp.listing_id);
      } else if (mkp.listing_id) {
        if (mkp.marketplace === 'mercadolivre' || String(mkp.listing_id).startsWith('MLB')) {
          addLink(`https://produto.mercadolivre.com.br/${mkp.listing_id}`, 'mercadolivre', mkp.listing_id);
        }
      }
    });
  }

  // 2. Verificar anúncios vinculados em ml_listing_variants (ads)
  if (Array.isArray(allAds) && allAds.length > 0) {
    const productAds = allAds.filter((ad: any) => ad.product_id === product.id || ad.product?.id === product.id);
    productAds.forEach((ad: any) => {
      if (ad.permalink) {
        addLink(ad.permalink, ad.marketplace || 'mercadolivre', ad.ml_item_id);
      } else if (ad.ml_item_id) {
        addLink(`https://produto.mercadolivre.com.br/${ad.ml_item_id}`, 'mercadolivre', ad.ml_item_id);
      }
    });
  }

  // 3. Verificar mercadolivre_published_products
  if (Array.isArray(publishedProducts) && publishedProducts.length > 0) {
    const published = publishedProducts.find((p: any) => p.product_id === product.id && p.status === 'published');
    if (published) {
      if (published.permalink) {
        addLink(published.permalink, 'mercadolivre', published.ml_item_id);
      } else if (published.ml_item_id) {
        addLink(`https://produto.mercadolivre.com.br/${published.ml_item_id}`, 'mercadolivre', published.ml_item_id);
      }
    }
  }

  // 4. Verificar reference_ad_url ou reference_item_id do produto
  if (product.reference_ad_url) {
    addLink(product.reference_ad_url, null, product.reference_item_id);
  } else if (product.reference_item_id && typeof product.reference_item_id === 'string' && product.reference_item_id.startsWith('MLB')) {
    addLink(`https://produto.mercadolivre.com.br/${product.reference_item_id}`, 'mercadolivre', product.reference_item_id);
  }

  return links;
};
