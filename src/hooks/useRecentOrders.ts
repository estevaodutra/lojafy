import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRecentOrdersDemo } from './useRecentOrdersDemo';

export interface RecentOrder {
  id: string;
  created_at: string;
  order_number: string;
  product_name: string;
  product_image: string;
  customer_name: string;
  cost_price: number;
  unit_price: number;
  quantity: number;
  profit: number;
  status?: string;
}

export const useRecentOrders = (useDemo: boolean = true) => {
  // Use demo data by default for better user experience
  const demoQuery = useRecentOrdersDemo();
  
  const realQuery = useQuery({
    queryKey: ['recent-orders'],
    queryFn: async (): Promise<RecentOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          order_number,
          user_id,
          order_items!inner (
            unit_price,
            quantity,
            products!inner (
              name,
              image_url,
              main_image_url,
              cost_price
            )
          )
        `)
        .in('status', ['confirmed', 'shipped', 'delivered', 'processing'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching recent orders:', error);
        throw error;
      }

      // Get user profiles separately
      const userIds = data?.map(order => order.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Create a map of user profiles
      const profileMap = new Map(
        profiles?.map(profile => [
          profile.user_id, 
          `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        ])
      );

      // Transform the data to match our interface
      const transformedData: RecentOrder[] = [];
      
      data?.forEach((order) => {
        order.order_items.forEach((item: any) => {
          const profit = (item.unit_price - (item.products.cost_price || 0)) * item.quantity;
          
          transformedData.push({
            id: `${order.id}-${item.products.name}`,
            created_at: order.created_at,
            order_number: order.order_number,
            product_name: item.products.name,
            product_image: item.products.main_image_url || item.products.image_url,
            customer_name: profileMap.get(order.user_id) || 'Cliente',
            cost_price: item.products.cost_price || 0,
            unit_price: item.unit_price,
            quantity: item.quantity,
            profit: profit,
            status: 'confirmed'
          });
        });
      });

      return transformedData;
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    enabled: !useDemo, // Only run when not using demo data
  });

  const query = useDemo ? demoQuery : realQuery;

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        () => {
          query.refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        () => {
          query.refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query]);

  return query;
};