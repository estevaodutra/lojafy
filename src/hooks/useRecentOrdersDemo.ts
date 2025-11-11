import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface RecentOrder {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  total_amount: number;
  customer_name: string;
  product_name: string;
  product_image: string;
  unit_price: number;
  quantity: number;
  profit: number;
}

export const useRecentOrdersDemo = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recent-orders-demo'],
    queryFn: async (): Promise<RecentOrder[]> => {
      // Fetch recent demo orders with their items and products
      const { data, error } = await supabase
        .from('demo_orders')
        .select(`
          id,
          order_number,
          created_at,
          status,
          total_amount,
          demo_user_id,
          demo_order_items (
            unit_price,
            quantity,
            products (
              id,
              name,
              image_url,
              main_image_url,
              cost_price
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching demo recent orders:', error);
        throw error;
      }

      // Fetch demo users to get customer names
      const { data: demoUsers, error: usersError } = await supabase
        .from('demo_users')
        .select('id, first_name, last_name');

      if (usersError) {
        console.error('Error fetching demo users:', usersError);
        throw usersError;
      }

      // Create user lookup map
      const userMap = new Map(
        demoUsers?.map(user => [user.id, `${user.first_name} ${user.last_name}`]) || []
      );

      // Transform data to match RecentOrder interface
      const recentOrders: RecentOrder[] = [];

      data?.forEach(order => {
        order.demo_order_items.forEach(item => {
          const product = item.products;
          if (product) {
            const costPrice = product.cost_price || 0;
            const profit = (item.unit_price - costPrice) * item.quantity;

            recentOrders.push({
              id: order.id,
              order_number: order.order_number,
              created_at: order.created_at,
              status: order.status,
              total_amount: order.total_amount,
              customer_name: userMap.get(order.demo_user_id) || 'Cliente Demo',
              product_name: product.name,
              product_image: product.main_image_url || product.image_url || '',
              unit_price: item.unit_price,
              quantity: item.quantity,
              profit: profit
            });
          }
        });
      });

      // Sort by created_at descending and take top 15
      return recentOrders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('demo-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'demo_orders'
        },
        (payload) => {
          console.log('🔔 Novo pedido inserido:', payload);
          // Invalidate cache to trigger automatic refetch
          queryClient.invalidateQueries({ queryKey: ['recent-orders-demo'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'demo_order_items'
        },
        (payload) => {
          console.log('🔔 Novo item de pedido inserido:', payload);
          queryClient.invalidateQueries({ queryKey: ['recent-orders-demo'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};