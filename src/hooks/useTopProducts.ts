import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTopProductsReal } from './useTopProductsReal';
import { useTopProductsDemo } from './useTopProductsDemo';
import { useEffect } from 'react';

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
  const queryClient = useQueryClient();

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

  const realProductsQuery = useTopProductsReal();
  const demoQuery = useTopProductsDemo();

  // Subscribe to real-time updates for external product_ranking table
  useEffect(() => {
    const channel = supabase
      .channel('product-ranking-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE or DELETE
          schema: 'public',
          table: 'product_ranking'
        },
        (payload) => {
          console.log('🏆 Ranking externo atualizado:', payload);
          queryClient.invalidateQueries({ queryKey: ['external-ranking'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Prioridade: Externo > Real > Demo
  const data = externalRankingQuery.data || realProductsQuery.data || demoQuery.data;
  const isLoading = externalRankingQuery.isLoading || 
                    (!externalRankingQuery.data && realProductsQuery.isLoading) ||
                    (!externalRankingQuery.data && !realProductsQuery.data && demoQuery.isLoading);
  const error = externalRankingQuery.error || 
                (!externalRankingQuery.data && realProductsQuery.error) ||
                (!externalRankingQuery.data && !realProductsQuery.data && demoQuery.error);
  
  const isRealData = !!(externalRankingQuery.data || realProductsQuery.data);

  return { data, isLoading, error, isRealData };
};