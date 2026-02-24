import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Plan {
  id: string;
  nome: string;
  slug: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number;
  preco_vitalicio: number;
  cor: string;
  icone: string;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
  feature_count?: number;
  user_count?: number;
}

export interface PlanFormData {
  nome: string;
  slug: string;
  descricao?: string;
  preco_mensal: number;
  preco_anual: number;
  preco_vitalicio: number;
  cor: string;
  icone: string;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
}

export function usePlans() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ['plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('ordem', { ascending: true });
      if (error) throw error;

      // Fetch counts for each plan
      const plansWithCounts: Plan[] = await Promise.all(
        (data || []).map(async (plan: any) => {
          const [featureRes, userRes] = await Promise.all([
            supabase.rpc('get_plan_feature_count', { _plan_id: plan.id }),
            supabase.rpc('get_plan_user_count', { _plan_id: plan.id }),
          ]);
          return {
            ...plan,
            feature_count: featureRes.data ?? 0,
            user_count: userRes.data ?? 0,
          };
        })
      );
      return plansWithCounts;
    },
  });

  const createPlan = useMutation({
    mutationFn: async (data: PlanFormData) => {
      const { error } = await supabase.from('plans').insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Plano criado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao criar plano', description: err.message, variant: 'destructive' });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PlanFormData> }) => {
      const { error } = await supabase.from('plans').update(data as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Plano atualizado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar plano', description: err.message, variant: 'destructive' });
    },
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Plano excluído com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao excluir plano', description: err.message, variant: 'destructive' });
    },
  });

  const duplicatePlan = useMutation({
    mutationFn: async (plan: Plan) => {
      // Create plan copy
      const { data: newPlan, error: planError } = await supabase
        .from('plans')
        .insert({
          nome: `${plan.nome} (cópia)`,
          slug: `${plan.slug}-copia-${Date.now()}`,
          descricao: plan.descricao,
          preco_mensal: plan.preco_mensal,
          preco_anual: plan.preco_anual,
          preco_vitalicio: plan.preco_vitalicio,
          cor: plan.cor,
          icone: plan.icone,
          destaque: false,
          ativo: false,
          ordem: plan.ordem + 1,
        } as any)
        .select()
        .single();
      if (planError) throw planError;

      // Copy features
      const { data: features } = await supabase
        .from('plan_features')
        .select('feature_id, limites')
        .eq('plan_id', plan.id);

      if (features && features.length > 0) {
        const { error: featError } = await supabase.from('plan_features').insert(
          features.map((f: any) => ({
            plan_id: (newPlan as any).id,
            feature_id: f.feature_id,
            limites: f.limites,
          })) as any
        );
        if (featError) throw featError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      toast({ title: 'Plano duplicado com sucesso' });
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao duplicar plano', description: err.message, variant: 'destructive' });
    },
  });

  return {
    plans: plansQuery.data || [],
    isLoading: plansQuery.isLoading,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
  };
}
