import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupplierProducts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-products', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            slug
          )
        `)
        .eq('supplier_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useSupplierProductStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-product-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: products, error } = await supabase
        .from('products')
        .select('id, active, stock_quantity')
        .eq('supplier_id', user.id);

      if (error) throw error;

      const total = products?.length || 0;
      const active = products?.filter(p => p.active).length || 0;
      const lowStock = products?.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0).length || 0;
      const outOfStock = products?.filter(p => p.stock_quantity === 0).length || 0;

      return {
        total,
        active,
        lowStock,
        outOfStock,
      };
    },
    enabled: !!user?.id,
  });
};
