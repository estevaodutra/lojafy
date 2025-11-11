import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useAdminPendingProducts = () => {
  return useQuery({
    queryKey: ['admin-pending-products'],
    queryFn: async () => {
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
        .in('approval_status', ['pending_approval', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const useAdminApprovalStats = () => {
  return useQuery({
    queryKey: ['admin-approval-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('approval_status')
        .in('approval_status', ['pending_approval', 'approved', 'rejected']);

      if (error) throw error;

      const pending = data?.filter(p => p.approval_status === 'pending_approval').length || 0;
      const approved = data?.filter(p => p.approval_status === 'approved').length || 0;
      const rejected = data?.filter(p => p.approval_status === 'rejected').length || 0;

      return { pending, approved, rejected, total: data?.length || 0 };
    },
  });
};
