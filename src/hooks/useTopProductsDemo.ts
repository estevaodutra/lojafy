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

export const useTopProductsDemo = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['top-products-demo'],
    queryFn: async (): Promise<TopProduct[]> => {
      // Query products with demo sales from last 7 days
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          image_url,
          main_image_url,
          cost_price,
          price,
          demo_order_items!inner (
            unit_price,
            quantity,
            demo_orders!inner (
              created_at,
              status
            )
          )
        `)
        .gte('demo_order_items.demo_orders.created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('demo_order_items.demo_orders.status', 'confirmed');
      
      if (error) {
        console.error('Error fetching demo top products:', error);
        throw error;
      }

      // Process and aggregate the data
      const productStats = new Map<string, TopProduct>();
      
      data?.forEach((product) => {
        const productId = product.id;
        
        if (!productStats.has(productId)) {
          productStats.set(productId, {
            id: product.id,
            name: product.name,
            image_url: product.image_url,
            main_image_url: product.main_image_url,
            cost_price: product.cost_price || 0,
            price: product.price,
            total_sales: 0,
            avg_price: 0,
            avg_profit: 0,
            days_with_sales: 0
          });
        }
        
        const stats = productStats.get(productId)!;
        const datesWithSales = new Set<string>();
        
        product.demo_order_items.forEach((item: any) => {
          stats.total_sales += item.quantity;
          
          // Track unique days with sales
          const orderDate = new Date(item.demo_orders.created_at).toDateString();
          datesWithSales.add(orderDate);
        });
        
        stats.days_with_sales = datesWithSales.size;
        
        // Calculate averages
        const totalRevenue = product.demo_order_items.reduce((sum: number, item: any) => 
          sum + (item.unit_price * item.quantity), 0);
        const totalItems = product.demo_order_items.reduce((sum: number, item: any) => 
          sum + item.quantity, 0);
          
        stats.avg_price = totalItems > 0 ? totalRevenue / totalItems : 0;
        stats.avg_profit = stats.avg_price - stats.cost_price;
      });

      // Convert to array and sort by total sales
      const result = Array.from(productStats.values())
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 10);

      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Subscribe to real-time updates for ranking changes
  useEffect(() => {
    const channel = supabase
      .channel('top-products-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'demo_order_items'
        },
        (payload) => {
          console.log('📊 Ranking atualizado - novo item vendido:', payload);
          // Invalidate cache to recalculate ranking
          queryClient.invalidateQueries({ queryKey: ['top-products-demo'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'demo_orders',
          filter: 'status=eq.confirmed'
        },
        (payload) => {
          console.log('✅ Pedido confirmado - atualizando ranking:', payload);
          queryClient.invalidateQueries({ queryKey: ['top-products-demo'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};