import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlanFeature {
  id: string;
  plan_id: string;
  feature_id: string;
  limites: Record<string, any>;
  created_at: string;
}

export interface Feature {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  icone: string | null;
  categoria: string;
  ativo: boolean;
}

export function usePlanFeatures(planId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const planFeaturesQuery = useQuery({
    queryKey: ['plan-features', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plan_features')
        .select('*, features(*)')
        .eq('plan_id', planId!);
      if (error) throw error;
      return data as any[];
    },
  });

  const allFeaturesQuery = useQuery({
    queryKey: ['all-features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .eq('ativo', true)
        .order('ordem_exibicao', { ascending: true });
      if (error) throw error;
      return data as Feature[];
    },
  });

  const savePlanFeatures = useMutation({
    mutationFn: async ({
      planId,
      featureIds,
      limites,
    }: {
      planId: string;
      featureIds: string[];
      limites: Record<string, Record<string, any>>;
    }) => {
      // Delete existing
      const { error: delError } = await supabase
        .from('plan_features')
        .delete()
        .eq('plan_id', planId);
      if (delError) throw delError;

      // Insert new
      if (featureIds.length > 0) {
        const rows = featureIds.map((fid) => ({
          plan_id: planId,
          feature_id: fid,
          limites: limites[fid] || {},
        }));
        const { error: insError } = await supabase.from('plan_features').insert(rows as any);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-features'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Features do plano atualizadas' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao salvar features', description: err.message, variant: 'destructive' });
    },
  });

  return {
    planFeatures: planFeaturesQuery.data || [],
    allFeatures: allFeaturesQuery.data || [],
    isLoading: planFeaturesQuery.isLoading || allFeaturesQuery.isLoading,
    savePlanFeatures,
  };
}
