export interface MarketplaceActionLink {
  marketplace: string; // 'mercadolivre' | 'shopee' | 'amazon' | 'other'
  name: string; // 'Mercado Livre' | 'Shopee' | 'Amazon' | 'Marketplace'
  url: string;
  badgeIcon?: string;
  itemId?: string | null;
}

export interface MarketplaceValidationInfo {
  marketplace: string;
  name: string;
  badgeIcon: string;
  isValidated: boolean;
  status: 'published' | 'validated';
  statusLabel: string;
  url?: string | null;
  itemId?: string | null;
}

/**
 * Retorna metadados visuais de cada marketplace suportado.
 */
export const getMarketplaceMeta = (rawMkp?: string | null) => {
  const key = (rawMkp || 'mercadolivre').toLowerCase().trim();
  if (key === 'mercadolivre' || key === 'mercado_livre' || key === 'ml') {
    return {
      key: 'mercadolivre',
      name: 'Mercado Livre',
      badgeIcon: 'https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png',
    };
  }
  if (key === 'shopee') {
    return {
      key: 'shopee',
      name: 'Shopee',
      badgeIcon: 'https://deo.shopeemobile.com/shopee/shopee-pcmall-live-sg/assets/icon_favicon_1_96.1ce0e05fc18a86e5.png',
    };
  }
  if (key === 'amazon') {
    return {
      key: 'amazon',
      name: 'Amazon',
      badgeIcon: 'https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg',
    };
  }
  return {
    key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    badgeIcon: 'https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png',
  };
};

/**
 * Retorna apenas as validações consolidadas e ÚNICAS de marketplace para um produto.
 * Apenas produtos genuinamente validados para subir no marketplace (is_validated = true / status ready/active/published)
 * ou já publicados aparecem aqui.
 * NÃO inclui referências externas brutas e NUNCA repete o mesmo marketplace mais de uma vez.
 */
export const getProductMarketplaceValidations = (
  product: any,
  publishedProducts: any[] = [],
  allAds: any[] = []
): MarketplaceValidationInfo[] => {
  if (!product) return [];
  const map = new Map<string, MarketplaceValidationInfo>();

  // 1. Verificar registros na tabela oficial de validação: product_marketplace_data
  if (Array.isArray(product.product_marketplace_data) && product.product_marketplace_data.length > 0) {
    product.product_marketplace_data.forEach((mkp: any) => {
      const meta = getMarketplaceMeta(mkp.marketplace);
      const isVal = Boolean(
        mkp.is_validated === true ||
        ['ready', 'active', 'published'].includes(mkp.listing_status) ||
        mkp.listing_id ||
        mkp.listing_url
      );

      if (isVal) {
        let url = mkp.listing_url || null;
        if (!url && mkp.listing_id && (meta.key === 'mercadolivre' || String(mkp.listing_id).startsWith('MLB'))) {
          url = `https://produto.mercadolivre.com.br/${mkp.listing_id}`;
        }

        const isPublished = Boolean(url || ['active', 'published'].includes(mkp.listing_status));

        map.set(meta.key, {
          marketplace: meta.key,
          name: meta.name,
          badgeIcon: meta.badgeIcon,
          isValidated: true,
          status: isPublished ? 'published' : 'validated',
          statusLabel: isPublished ? 'Anúncio Ativo' : 'Validado para envio',
          url,
          itemId: mkp.listing_id || null,
        });
      }
    });
  }

  // 2. Verificar se o produto está ativamente publicado em mercadolivre_published_products
  if (Array.isArray(publishedProducts) && publishedProducts.length > 0) {
    const published = publishedProducts.find(
      (p: any) => p.product_id === product.id && p.status === 'published'
    );
    if (published) {
      const meta = getMarketplaceMeta('mercadolivre');
      const url =
        published.permalink ||
        (published.ml_item_id ? `https://produto.mercadolivre.com.br/${published.ml_item_id}` : null);
      const existing = map.get('mercadolivre');

      map.set('mercadolivre', {
        marketplace: meta.key,
        name: meta.name,
        badgeIcon: meta.badgeIcon,
        isValidated: true,
        status: 'published',
        statusLabel: 'Anúncio Ativo',
        url: url || existing?.url || null,
        itemId: published.ml_item_id || existing?.itemId || null,
      });
    }
  }

  // 3. Verificar anúncios em ml_listing_variants (apenas anúncios que estejam com status 'published')
  if (Array.isArray(allAds) && allAds.length > 0) {
    const publishedAd = allAds.find(
      (ad: any) =>
        (ad.product_id === product.id || ad.product?.id === product.id) &&
        ad.status === 'published' &&
        (ad.permalink || ad.ml_item_id)
    );

    if (publishedAd) {
      const meta = getMarketplaceMeta(publishedAd.marketplace || 'mercadolivre');
      const url =
        publishedAd.permalink ||
        (publishedAd.ml_item_id ? `https://produto.mercadolivre.com.br/${publishedAd.ml_item_id}` : null);
      const existing = map.get(meta.key);

      if (!existing || !existing.url) {
        map.set(meta.key, {
          marketplace: meta.key,
          name: meta.name,
          badgeIcon: meta.badgeIcon,
          isValidated: true,
          status: 'published',
          statusLabel: 'Anúncio Ativo',
          url: url || existing?.url || null,
          itemId: publishedAd.ml_item_id || existing?.itemId || null,
        });
      }
    }
  }

  return Array.from(map.values());
};

/**
 * Retorna os links diretos para os anúncios de marketplaces em que o produto está integrado.
 * Retorna no máximo 1 link por marketplace, sem repetições.
 */
export const getProductMarketplaceLinks = (
  product: any,
  allAds: any[] = [],
  publishedProducts: any[] = []
): MarketplaceActionLink[] => {
  const validations = getProductMarketplaceValidations(product, publishedProducts, allAds);
  return validations
    .filter((v) => Boolean(v.url))
    .map((v) => ({
      marketplace: v.marketplace,
      name: v.name,
      url: v.url!,
      badgeIcon: v.badgeIcon,
      itemId: v.itemId,
    }));
};
