import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

export const useTopProductsReal = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['top-products-real'],
    queryFn: async (): Promise<TopProduct[]> => {
      // Buscar pedidos confirmados/processados dos últimos 7 dias
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          image_url,
          main_image_url,
          cost_price,
          price,
          order_items!inner (
            unit_price,
            quantity,
            order_id,
            orders!inner (
              created_at,
              status
            )
          )
        `)
        .gte('order_items.orders.created_at', sevenDaysAgo)
        .in('order_items.orders.status', ['confirmed', 'processing', 'shipped', 'delivered']);

      if (error) {
        console.error('Error fetching real top products:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Processar e agregar dados
      const productStats = new Map<string, {
        product: typeof data[0];
        total_sales: number;
        dates: Set<string>;
        items: any[];
      }>();
      
      data.forEach((product) => {
        const productId = product.id;
        
        if (!productStats.has(productId)) {
          productStats.set(productId, {
            product,
            total_sales: 0,
            dates: new Set<string>(),
            items: []
          });
        }
        
        const stats = productStats.get(productId)!;
        const items = product.order_items as any[];
        
        items.forEach((item: any) => {
          stats.total_sales += item.quantity;
          stats.items.push(item);
          
          // Rastrear dias únicos com vendas
          const orderDate = new Date(item.orders.created_at).toDateString();
          stats.dates.add(orderDate);
        });
      });

      // Converter para array e calcular médias
      const topProducts: TopProduct[] = Array.from(productStats.entries()).map(([id, stats]) => {
        const totalRevenue = stats.items.reduce((sum: number, item: any) => 
          sum + (item.unit_price * item.quantity), 0);
        const totalItems = stats.items.reduce((sum: number, item: any) => 
          sum + item.quantity, 0);
          
        const avg_price = totalItems > 0 ? totalRevenue / totalItems : 0;
        const avg_profit = avg_price - (stats.product.cost_price || 0);

        return {
          id: stats.product.id,
          name: stats.product.name,
          image_url: stats.product.image_url || '',
          main_image_url: stats.product.main_image_url || stats.product.image_url || '',
          cost_price: stats.product.cost_price || 0,
          price: stats.product.price,
          total_sales: stats.total_sales,
          avg_price: avg_price,
          avg_profit: avg_profit,
          days_with_sales: stats.dates.size
        };
      });

      // Ordenar por vendas e retornar top 10
      return topProducts
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 10);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('real-top-products-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_items'
        },
        (payload) => {
          console.log('📊 Ranking real atualizado - novo item vendido:', payload);
          queryClient.invalidateQueries({ queryKey: ['top-products-real'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload: any) => {
          const status = payload.new?.status;
          if (['confirmed', 'processing', 'shipped', 'delivered'].includes(status)) {
            console.log('✅ Pedido real confirmado - atualizando ranking:', payload);
            queryClient.invalidateQueries({ queryKey: ['top-products-real'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
