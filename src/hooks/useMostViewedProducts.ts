import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MostViewedProduct {
  id: string;
  name: string;
  views: number;
  image: string;
}

export const useMostViewedProducts = () => {
  return useQuery({
    queryKey: ['most-viewed-products'],
    queryFn: async (): Promise<MostViewedProduct[]> => {
      // Since we don't have a product_views table yet, we'll use products with some logic
      // We'll base "views" on a combination of rating, review_count, and random factor
      const { data, error } = await supabase
        .from('products')
        .select('id, name, image_url, rating, review_count, created_at')
        .eq('active', true)
        .order('rating', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data?.map((product, index) => ({
        id: product.id,
        name: product.name,
        views: Math.floor(
          (product.rating || 0) * 100 + 
          (product.review_count || 0) * 5 + 
          Math.random() * 200 + 150 - (index * 20)
        ),
        image: product.image_url || '/placeholder.svg'
      })).sort((a, b) => b.views - a.views) || [];
    },
  });
};