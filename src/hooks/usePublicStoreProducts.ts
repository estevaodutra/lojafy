import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicStoreProductData {
  id: string;
  reseller_id: string;
  product_id: string;
  active: boolean;
  custom_price?: number;
  custom_description?: string;
  position: number;
  created_at: string;
  updated_at: string;
  product: {
    id: string;
    name: string;
    price: number;
    image_url: string;
    main_image_url?: string;
    images: string[];
    rating: number;
    badge?: string;
    category_id: string;
    featured: boolean;
    high_rotation: boolean;
    active: boolean;
  };
}

export const usePublicStoreProducts = (resellerId?: string) => {
  return useQuery({
    queryKey: ['public-store-products', resellerId],
    queryFn: async () => {
      if (!resellerId) throw new Error('Reseller ID required');
      
      const { data, error } = await supabase
        .from('reseller_products')
        .select(`
          *,
          product:products!inner(
            id,
            name,
            price,
            image_url,
            main_image_url,
            images,
            rating,
            badge,
            category_id,
            featured,
            high_rotation,
            active
          )
        `)
        .eq('reseller_id', resellerId)
        .eq('active', true)
        .eq('product.active', true)
        .order('position', { ascending: true });

      if (error) throw error;
      return data as PublicStoreProductData[];
    },
    enabled: !!resellerId,
  });
};

export const usePublicStoreFeaturedProducts = (resellerId?: string) => {
  return useQuery({
    queryKey: ['public-store-featured-products', resellerId],
    queryFn: async () => {
      if (!resellerId) throw new Error('Reseller ID required');
      
      const { data, error } = await supabase
        .from('reseller_products')
        .select(`
          *,
          product:products!inner(
            id,
            name,
            price,
            image_url,
            main_image_url,
            images,
            rating,
            badge,
            category_id,
            featured,
            high_rotation,
            active
          )
        `)
        .eq('reseller_id', resellerId)
        .eq('active', true)
        .eq('product.active', true)
        .eq('product.featured', true)
        .order('position', { ascending: true })
        .limit(4);

      if (error) throw error;
      return data as PublicStoreProductData[];
    },
    enabled: !!resellerId,
  });
};

export const usePublicStoreCategories = (resellerId?: string) => {
  return useQuery({
    queryKey: ['public-store-categories', resellerId],
    queryFn: async () => {
      if (resellerId) {
        try {
          const { data: resellerProducts, error: productsError } = await supabase
            .from('reseller_products')
            .select(`
              product:products!inner(category_id, active, categories!category_id(id, name, slug, icon, color, image_url))
            `)
            .eq('reseller_id', resellerId)
            .eq('active', true)
            .eq('product.active', true);

          if (!productsError && resellerProducts && resellerProducts.length > 0) {
            const categoriesMap = new Map();
            resellerProducts.forEach(item => {
              const category = item.product?.categories;
              if (category && !categoriesMap.has(category.id)) {
                categoriesMap.set(category.id, { ...category, products: [] });
              }
            });
            const resellerCats = Array.from(categoriesMap.values());
            if (resellerCats.length > 0) {
              return resellerCats;
            }
          }
        } catch (e) {
          console.warn('[usePublicStoreCategories] Reseller categories error, falling back:', e);
        }
      }

      // Fallback or main store: fetch all active categories
      const { data: allCategories, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) throw error;
      return allCategories || [];
    },
    enabled: true,
  });
};

export const usePublicStoreCategoryProducts = (resellerId?: string, categorySlug?: string) => {
  return useQuery({
    queryKey: ['public-store-category-products', resellerId, categorySlug],
    queryFn: async () => {
      if (!resellerId) throw new Error('Reseller ID required');

      let query = supabase
        .from('reseller_products')
        .select(`
          *,
          products!inner(
            *,
            categories!category_id(id, slug, name)
          )
        `)
        .eq('reseller_id', resellerId)
        .eq('active', true)
        .eq('products.active', true);

      if (categorySlug) {
        query = query.eq('products.categories.slug', categorySlug);
      }

      const { data, error } = await query.order('position', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!resellerId,
  });
};