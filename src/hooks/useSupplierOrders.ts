import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupplierOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get orders that contain supplier's products
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            *,
            products!inner (
              id,
              name,
              supplier_id
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Filter orders that have at least one product from this supplier
      const supplierOrders = orders?.filter(order => 
        order.order_items?.some((item: any) => 
          item.products?.supplier_id === user.id
        )
      ) || [];

      // Get profiles for all unique user_ids
      const userIds = [...new Set(supplierOrders.map(order => order.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      // Create a profiles map for quick lookup
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.user_id, profile])
      );

      // Combine orders with profiles and filter order_items to only include supplier's products
      const ordersWithProfiles = supplierOrders.map(order => {
        const profile = profilesMap.get(order.user_id);
        const supplierItems = order.order_items?.filter((item: any) => 
          item.products?.supplier_id === user.id
        ) || [];

        return {
          ...order,
          order_items: supplierItems,
          profiles: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name
          } : { first_name: '', last_name: '' }
        };
      });

      return ordersWithProfiles;
    },
    enabled: !!user?.id,
  });
};

export const useSupplierOrderStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-order-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      // Get all order items with supplier's products
      const { data: orderItems, error } = await supabase
        .from('order_items')
        .select(`
          *,
          products!inner (
            supplier_id
          ),
          orders!inner (
            status,
            created_at
          )
        `)
        .eq('products.supplier_id', user.id);

      if (error) throw error;

      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const thisMonthOrders = orderItems?.filter((item: any) => 
        new Date(item.orders.created_at) >= firstDayOfMonth
      ) || [];

      const totalRevenue = thisMonthOrders.reduce((sum: number, item: any) => 
        sum + parseFloat(item.total_price || 0), 0
      );

      const totalOrders = new Set(thisMonthOrders.map((item: any) => item.order_id)).size;

      return {
        totalOrders,
        totalRevenue,
        totalItems: thisMonthOrders.length,
      };
    },
    enabled: !!user?.id,
  });
};
