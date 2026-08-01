import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useSupplierPendingProducts = (orgId?: string) => {
  return useQuery({
    queryKey: ['supplier-pending-products', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories!category_id (
            id,
            name,
            slug
          )
        `)
        .eq('supplier_organization_id', orgId)
        .in('approval_status', ['pending_approval', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
};

export const useSupplierApprovalStats = (orgId?: string) => {
  return useQuery({
    queryKey: ['supplier-approval-stats', orgId],
    queryFn: async () => {
      if (!orgId) return { pending: 0, approved: 0, rejected: 0 };

      const { data, error } = await supabase
        .from('products')
        .select('approval_status')
        .eq('supplier_organization_id', orgId);

      if (error) throw error;

      const pending = data?.filter(p => p.approval_status === 'pending_approval').length || 0;
      const approved = data?.filter(p => p.approval_status === 'approved').length || 0;
      const rejected = data?.filter(p => p.approval_status === 'rejected').length || 0;

      return { pending, approved, rejected };
    },
    enabled: !!orgId,
  });
};
