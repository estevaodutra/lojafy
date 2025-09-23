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
          product:products(
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
            high_rotation
          )
        `)
        .eq('reseller_id', resellerId)
        .eq('active', true)
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
          product:products(
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
            high_rotation
          )
        `)
        .eq('reseller_id', resellerId)
        .eq('active', true)
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
      if (!resellerId) throw new Error('Reseller ID required');
      
      // First get unique categories from reseller products
      const { data: resellerProducts, error: productsError } = await supabase
        .from('reseller_products')
        .select(`
          product:products(category_id, categories(id, name, slug, icon, color))
        `)
        .eq('reseller_id', resellerId)
        .eq('active', true);

      if (productsError) throw productsError;

      // Extract unique categories
      const categoriesMap = new Map();
      resellerProducts.forEach(item => {
        const category = item.product?.categories;
        if (category && !categoriesMap.has(category.id)) {
          categoriesMap.set(category.id, category);
        }
      });

      const categories = Array.from(categoriesMap.values());

      // Get products for each category
      const categoriesWithProducts = await Promise.all(
        categories.map(async (category) => {
          const { data: categoryProducts, error } = await supabase
            .from('reseller_products')
            .select(`
              *,
              product:products(
                id,
                name,
                price,
                image_url,
                main_image_url,
                images,
                rating,
                badge,
                category_id
              )
            `)
            .eq('reseller_id', resellerId)
            .eq('active', true)
            .eq('product.category_id', category.id)
            .order('position', { ascending: true })
            .limit(8);

          if (error) throw error;

          return {
            ...category,
            products: categoryProducts || []
          };
        })
      );

      // Filter categories with at least 5 products
      return categoriesWithProducts.filter(cat => cat.products.length >= 5);
    },
    enabled: !!resellerId,
  });
};