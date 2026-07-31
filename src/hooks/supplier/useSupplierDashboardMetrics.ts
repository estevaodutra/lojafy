import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from './useSupplierOrganization';

export interface SupplierDashboardMetrics {
  awaiting_picking: number;
  picking: number;
  packing: number;
  labels_pending: number;
  due_today: number;
  late: number;
  occurrences_open: number;
  critical_stock: number;
  shipped_today: number;
  avg_picking_hours_7d: number | null;
}

export const useSupplierDashboardMetrics = () => {
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  return useQuery<SupplierDashboardMetrics | null>({
    queryKey: orgId ? supplierKeys.dashboard(orgId) : ['supplier', 'dashboard', 'pending'],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase.rpc('get_supplier_dashboard_metrics', {
        p_org_id: orgId,
      });
      if (error) throw error;
      return data as unknown as SupplierDashboardMetrics;
    },
    enabled: !!orgId,
    staleTime: 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};
