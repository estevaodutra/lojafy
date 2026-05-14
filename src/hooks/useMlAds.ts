import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MlAd {
  id: string;
  item_id: string;
  title?: string;
  thumbnail?: string;
  status: 'active' | 'paused';
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spent?: number;
}

export interface MlAdBudget {
  daily_budget: number;
  remaining: number;
  status: string;
}

export interface MlAdDashboard {
  impressions: number;
  clicks: number;
  conversions: number;
  spent: number;
  ctr: number;
}

async function mlCall(mlPath: string, method = 'GET', payload?: unknown, resellerUserId?: string) {
  const { data, error } = await supabase.functions.invoke('ml-proxy', {
    body: { ml_path: mlPath, method, payload, reseller_user_id: resellerUserId },
  });
  if (error) throw error;
  return data;
}

async function getMlUserId(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('ml_user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  return data?.ml_user_id ?? null;
}

export function useMlAds(resellerUserId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = resellerUserId ?? user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ml-ads', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return { ads: [], budget: null, dashboard: null };
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return { ads: [], budget: null, dashboard: null };

      const [adsRes, budgetRes, dashboardRes] = await Promise.allSettled([
        mlCall(`/advertising/product_ads/users/${mlUserId}/ad_products`, 'GET', undefined, resellerUserId),
        mlCall(`/advertising/product_ads/users/${mlUserId}/budget`, 'GET', undefined, resellerUserId),
        mlCall(`/advertising/product_ads/users/${mlUserId}/dashboard`, 'GET', undefined, resellerUserId),
      ]);

      const ads: MlAd[] = adsRes.status === 'fulfilled' ? (adsRes.value?.data?.results ?? []) : [];
      const budget: MlAdBudget | null = budgetRes.status === 'fulfilled' ? budgetRes.value?.data : null;
      const dashRaw = dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data : null;

      const dashboard: MlAdDashboard | null = dashRaw ? {
        impressions: dashRaw.impressions ?? 0,
        clicks: dashRaw.clicks ?? 0,
        conversions: dashRaw.conversions ?? 0,
        spent: dashRaw.spent ?? 0,
        ctr: dashRaw.impressions > 0 ? (dashRaw.clicks / dashRaw.impressions) * 100 : 0,
      } : null;

      return { ads, budget, dashboard };
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!targetUserId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ml-ads', targetUserId] });

  const createAdMutation = useMutation({
    mutationFn: async (mlItemId: string) => {
      const mlUserId = await getMlUserId(targetUserId!);
      if (!mlUserId) throw new Error('ML not connected');
      const res = await mlCall(
        `/advertising/product_ads/users/${mlUserId}/ad_products`,
        'POST',
        { item_id: mlItemId },
        resellerUserId
      );
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao patrocinar anúncio');
      return res.data;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Anúncio patrocinado!' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const updateAdMutation = useMutation({
    mutationFn: async ({ adId, status }: { adId: string; status: 'active' | 'paused' }) => {
      const mlUserId = await getMlUserId(targetUserId!);
      if (!mlUserId) throw new Error('ML not connected');
      const res = await mlCall(
        `/advertising/product_ads/users/${mlUserId}/ad_products/${adId}`,
        'PUT',
        { status },
        resellerUserId
      );
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao atualizar anúncio');
    },
    onSuccess: (_, { status }) => {
      invalidate();
      toast({ title: status === 'active' ? 'Anúncio ativado!' : 'Anúncio pausado' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (dailyBudget: number) => {
      const mlUserId = await getMlUserId(targetUserId!);
      if (!mlUserId) throw new Error('ML not connected');
      const res = await mlCall(
        `/advertising/product_ads/users/${mlUserId}/budget`,
        'PUT',
        { daily_budget: dailyBudget },
        resellerUserId
      );
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao atualizar orçamento');
    },
    onSuccess: () => { invalidate(); toast({ title: 'Orçamento atualizado!' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  return {
    ads: data?.ads ?? [],
    budget: data?.budget ?? null,
    dashboard: data?.dashboard ?? null,
    isLoading,
    refetch,
    createAd: (mlItemId: string) => createAdMutation.mutateAsync(mlItemId),
    pauseAd: (adId: string) => updateAdMutation.mutateAsync({ adId, status: 'paused' }),
    activateAd: (adId: string) => updateAdMutation.mutateAsync({ adId, status: 'active' }),
    updateBudget: (amount: number) => updateBudgetMutation.mutateAsync(amount),
    isCreating: createAdMutation.isPending,
    isUpdatingBudget: updateBudgetMutation.isPending,
  };
}
