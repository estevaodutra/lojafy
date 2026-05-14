import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MlListing {
  id: string;
  title: string;
  price: number;
  available_quantity: number;
  sold_quantity: number;
  status: 'active' | 'paused' | 'closed' | 'under_review';
  thumbnail: string | null;
  permalink: string;
  listing_type_id: string;
  condition: string;
  category_id: string;
}

// Chama ml-proxy para o usuário atual (reseller) ou como reseller específico (super admin)
async function mlCall(
  mlPath: string,
  method = 'GET',
  payload?: unknown,
  resellerUserId?: string
): Promise<{ status: number; data: any }> {
  const { data, error } = await supabase.functions.invoke('ml-proxy', {
    body: { ml_path: mlPath, method, payload, reseller_user_id: resellerUserId },
  });
  if (error) throw error;
  return data;
}

export function useMlListings(resellerUserId?: string) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isSuperAdmin = profile?.role === 'super_admin';
  const targetUserId = resellerUserId ?? user?.id;

  const { data, isLoading, refetch, error } = useQuery({
    queryKey: ['ml-listings', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];

      // Buscar ml_user_id
      const { data: intg } = await supabase
        .from('mercadolivre_integrations')
        .select('ml_user_id')
        .eq('user_id', targetUserId)
        .eq('is_active', true)
        .single();

      if (!intg?.ml_user_id) return [];

      // Buscar todos os itens (active + paused)
      const [activeRes, pausedRes] = await Promise.all([
        mlCall(`/users/${intg.ml_user_id}/items/search?status=active&limit=100`, 'GET', undefined, resellerUserId),
        mlCall(`/users/${intg.ml_user_id}/items/search?status=paused&limit=100`, 'GET', undefined, resellerUserId),
      ]);

      const activeIds: string[] = activeRes?.data?.results ?? [];
      const pausedIds: string[] = pausedRes?.data?.results ?? [];
      const allIds = [...activeIds, ...pausedIds];

      if (allIds.length === 0) return [];

      // Buscar detalhes em lotes de 20 (limite da API)
      const chunks: string[][] = [];
      for (let i = 0; i < allIds.length; i += 20) chunks.push(allIds.slice(i, i + 20));

      const details: MlListing[] = [];
      for (const chunk of chunks) {
        const res = await mlCall(`/items?ids=${chunk.join(',')}`, 'GET', undefined, resellerUserId);
        const items = (res?.data ?? []).map((d: any) => d.body ?? d);
        details.push(...items.filter(Boolean));
      }

      return details as MlListing[];
    },
    staleTime: 60 * 1000, // 1 min
    enabled: !!targetUserId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['ml-listings', targetUserId] });

  async function updateItem(id: string, payload: Record<string, unknown>, successMsg: string) {
    try {
      const res = await mlCall(`/items/${id}`, 'PUT', payload, resellerUserId);
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao atualizar anúncio');
      toast({ title: successMsg });
      invalidate();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
      throw e;
    }
  }

  async function bulkOperation(
    ids: string[],
    payload: (id: string) => Record<string, unknown>,
    successMsg: string
  ) {
    const results = await Promise.allSettled(
      ids.map(id => mlCall(`/items/${id}`, 'PUT', payload(id), resellerUserId))
    );
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) {
      toast({ variant: 'destructive', title: `${failed} anúncio(s) falharam`, description: 'Os demais foram atualizados.' });
    } else {
      toast({ title: successMsg });
    }
    invalidate();
  }

  return {
    listings: data ?? [],
    isLoading,
    error,
    refetch,

    pauseListing: (id: string) => updateItem(id, { status: 'paused' }, 'Anúncio pausado'),
    activateListing: (id: string) => updateItem(id, { status: 'active' }, 'Anúncio ativado'),
    updatePrice: (id: string, price: number) => updateItem(id, { price }, 'Preço atualizado'),
    updateStock: (id: string, qty: number) => updateItem(id, { available_quantity: qty }, 'Estoque atualizado'),

    bulkPause: (ids: string[]) =>
      bulkOperation(ids, () => ({ status: 'paused' }), `${ids.length} anúncio(s) pausado(s)`),
    bulkActivate: (ids: string[]) =>
      bulkOperation(ids, () => ({ status: 'active' }), `${ids.length} anúncio(s) ativado(s)`),
    bulkUpdatePrice: (ids: string[], price: number) =>
      bulkOperation(ids, () => ({ price }), `Preço atualizado em ${ids.length} anúncio(s)`),
    bulkUpdatePricePct: (ids: string[], pct: number, currentPrices: Record<string, number>) =>
      bulkOperation(ids, id => ({ price: Math.round(currentPrices[id] * (1 + pct / 100) * 100) / 100 }), `Preço ajustado em ${ids.length} anúncio(s)`),
    bulkUpdateStock: (ids: string[], qty: number) =>
      bulkOperation(ids, () => ({ available_quantity: qty }), `Estoque atualizado em ${ids.length} anúncio(s)`),
  };
}
