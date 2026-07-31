import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import type { Database } from '@/integrations/supabase/types';

export type SupplierOrganization = Database['public']['Tables']['supplier_organizations']['Row'];
export type SupplierSettings = Database['public']['Tables']['supplier_settings']['Row'];

interface SupplierOrganizationData {
  organization: SupplierOrganization;
  settings: SupplierSettings | null;
  memberRole: string;
}

/**
 * Resolve a organização do fornecedor logado (respeitando impersonação).
 * Toda tela do portal fornecedor depende deste hook para obter o orgId.
 */
export const useSupplierOrganization = () => {
  const { getEffectiveUserId } = useAuth();
  const userId = getEffectiveUserId();

  return useQuery<SupplierOrganizationData | null>({
    queryKey: supplierKeys.org(userId),
    queryFn: async () => {
      if (!userId) return null;

      const { data: membership, error: memberError } = await supabase
        .from('supplier_members')
        .select('organization_id, role')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at')
        .limit(1)
        .maybeSingle();

      if (memberError) throw memberError;
      if (!membership) return null;

      const [{ data: organization, error: orgError }, { data: settings }] = await Promise.all([
        supabase
          .from('supplier_organizations')
          .select('*')
          .eq('id', membership.organization_id)
          .single(),
        supabase
          .from('supplier_settings')
          .select('*')
          .eq('organization_id', membership.organization_id)
          .maybeSingle(),
      ]);

      if (orgError) throw orgError;

      return {
        organization,
        settings: settings ?? null,
        memberRole: membership.role,
      };
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
  });
};
