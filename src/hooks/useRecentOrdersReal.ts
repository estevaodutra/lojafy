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

export const useRecentOrdersReal = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['recent-orders-real'],
    queryFn: async (): Promise<RecentOrder[]> => {
      // Buscar pedidos reais dos últimos 30 dias
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          created_at,
          status,
          total_amount,
          user_id,
          order_items (
            unit_price,
            quantity,
            product_id,
            products (
              id,
              name,
              image_url,
              main_image_url,
              cost_price
            )
          )
        `)
        .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching real orders:', error);
        throw error;
      }

      if (!orders || orders.length === 0) {
        return [];
      }

      // Buscar perfis dos clientes
      const userIds = [...new Set(orders.map(o => o.user_id).filter(Boolean))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const userMap = new Map(
        profiles?.map(p => [
          p.user_id, 
          `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Cliente'
        ]) || []
      );

      // Transformar dados
      const recentOrders: RecentOrder[] = [];

      orders.forEach(order => {
        const items = order.order_items as any[];
        items?.forEach((item: any) => {
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
              customer_name: userMap.get(order.user_id) || 'Cliente',
              product_name: product.name,
              product_image: product.main_image_url || product.image_url || '',
              unit_price: item.unit_price,
              quantity: item.quantity,
              profit: profit
            });
          }
        });
      });

      return recentOrders
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 15);
    },
    staleTime: 1 * 60 * 1000,
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('real-orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('🔔 Novo pedido real inserido:', payload);
          queryClient.invalidateQueries({ queryKey: ['recent-orders-real'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_items'
        },
        (payload) => {
          console.log('🔔 Novo item real inserido:', payload);
          queryClient.invalidateQueries({ queryKey: ['recent-orders-real'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('📝 Pedido real atualizado:', payload);
          queryClient.invalidateQueries({ queryKey: ['recent-orders-real'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
};
