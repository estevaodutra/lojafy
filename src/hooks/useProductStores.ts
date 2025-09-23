import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductStore {
  id: string;
  store_name: string;
  store_slug: string;
  logo_url?: string;
  custom_price?: number;
  original_price: number;
  primary_color: string;
  accent_color: string;
}

export const useProductStores = (productId?: string) => {
  return useQuery({
    queryKey: ['product-stores', productId],
    queryFn: async () => {
      if (!productId) throw new Error('Product ID is required');
      
      const { data, error } = await supabase
        .from('reseller_products')
        .select(`
          custom_price,
          reseller_id
        `)
        .eq('product_id', productId)
        .eq('active', true);

      if (error) throw error;

      if (!data || data.length === 0) return [];

      // Get unique reseller IDs
      const resellerIds = data.map(item => item.reseller_id);
      
      // Fetch store data for these resellers
      const { data: storesData, error: storesError } = await supabase
        .from('reseller_stores')
        .select(`
          id,
          store_name,
          store_slug,
          logo_url,
          primary_color,
          accent_color,
          reseller_id
        `)
        .in('reseller_id', resellerIds)
        .eq('active', true);

      if (storesError) throw storesError;

      // Get product price for fallback
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('price')
        .eq('id', productId)
        .single();

      if (productError) throw productError;

      // Combine the data
      return (storesData || []).map(store => {
        const resellerProduct = data.find(item => item.reseller_id === store.reseller_id);
        return {
          id: store.id,
          store_name: store.store_name,
          store_slug: store.store_slug,
          logo_url: store.logo_url,
          custom_price: resellerProduct?.custom_price,
          original_price: productData?.price || 0,
          primary_color: store.primary_color,
          accent_color: store.accent_color,
        };
      }).sort((a, b) => {
        const priceA = a.custom_price || a.original_price;
        const priceB = b.custom_price || b.original_price;
        return priceA - priceB;
      }) as ProductStore[];
    },
    enabled: !!productId
  });
};