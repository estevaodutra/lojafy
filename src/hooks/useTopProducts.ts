import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTopProductsDemo } from './useTopProductsDemo';

export interface TopProduct {
  id: string;
  name: string;
  image_url: string;
  main_image_url: string;
  cost_price: number;
  price: number;
  total_sales: number;
  avg_price: number;
  avg_profit: number;
  days_with_sales: number;
}

export const useTopProducts = () => {
  // First try to get external ranking data, fallback to demo data
  const externalRankingQuery = useQuery({
    queryKey: ['external-ranking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_ranking')
        .select(`
          position,
          average_sales_value,
          average_profit,
          daily_sales,
          product_id,
          products!inner (
            id,
            name,
            image_url,
            main_image_url,
            cost_price,
            price
          )
        `)
        .order('position', { ascending: true })
        .limit(10);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        return null; // No external ranking data
      }

      return data.map(item => ({
        id: item.product_id,
        name: item.products.name,
        image_url: item.products.image_url || '',
        main_image_url: item.products.main_image_url || item.products.image_url || '',
        cost_price: item.products.cost_price || 0,
        price: item.products.price,
        total_sales: Math.round(item.daily_sales * 7), // Estimate weekly sales
        avg_price: item.average_sales_value,
        avg_profit: item.average_profit,
        days_with_sales: 7 // Default to 7 days for external data
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });

  const demoQuery = useTopProductsDemo();

  // Return external ranking if available, otherwise use demo data
  return {
    data: externalRankingQuery.data || demoQuery.data,
    isLoading: externalRankingQuery.isLoading || (!externalRankingQuery.data && demoQuery.isLoading),
    error: externalRankingQuery.error || (!externalRankingQuery.data && demoQuery.error)
  };
};