import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useSupplierPendingProducts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-pending-products', user?.id],
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
        .in('approval_status', ['pending_approval', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useSupplierApprovalStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['supplier-approval-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('products')
        .select('approval_status')
        .eq('supplier_id', user.id);

      if (error) throw error;

      const pending = data?.filter(p => p.approval_status === 'pending_approval').length || 0;
      const approved = data?.filter(p => p.approval_status === 'approved').length || 0;
      const rejected = data?.filter(p => p.approval_status === 'rejected').length || 0;

      return { pending, approved, rejected };
    },
    enabled: !!user?.id,
  });
};
