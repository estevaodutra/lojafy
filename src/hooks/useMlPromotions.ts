import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MlPromotion {
  id: string;
  name: string;
  type: string;
  status: 'started' | 'paused' | 'finished' | 'candidate';
  start_date: string;
  finish_date: string;
  discount_type?: string;
  discount_value?: number;
  items_count?: number;
}

export interface MlPromotionItem {
  id: string;
  title: string;
  price: number;
  discount_value?: number;
  new_price?: number;
  thumbnail?: string;
}

export interface CreatePromotionData {
  name: string;
  type?: 'PRICE_DISCOUNT';
  status: 'started' | 'paused';
  start_date: string;
  finish_date: string;
  discount_type?: 'PERCENTAGE';
  discount_value: number;
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

export function useMlPromotions(resellerUserId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = resellerUserId ?? user?.id;

  const { data: promotions = [], isLoading, refetch } = useQuery({
    queryKey: ['ml-promotions', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return [];

      const res = await mlCall(
        `/seller-promotions/searches?seller_id=${mlUserId}&limit=50`,
        'GET', undefined, resellerUserId
      );
      return (res?.data?.results ?? []) as MlPromotion[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!targetUserId,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['ml-promotions', targetUserId] });

  const createMutation = useMutation({
    mutationFn: async (data: CreatePromotionData) => {
      const res = await mlCall('/seller-promotions', 'POST', {
        name: data.name,
        type: data.type ?? 'PRICE_DISCOUNT',
        status: data.status,
        start_date: data.start_date,
        finish_date: data.finish_date,
        discount_type: data.discount_type ?? 'PERCENTAGE',
        discount_value: data.discount_value,
      }, resellerUserId);

      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao criar promoção');
      return res.data;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Promoção criada!' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao criar promoção', description: e.message }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'started' | 'paused' | 'finished' }) => {
      const res = await mlCall(`/seller-promotions/${id}`, 'PUT', { status }, resellerUserId);
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao atualizar promoção');
      return res.data;
    },
    onSuccess: (_, { status }) => {
      invalidate();
      const labels: Record<string, string> = { started: 'Promoção iniciada!', paused: 'Promoção pausada', finished: 'Promoção encerrada' };
      toast({ title: labels[status] ?? 'Atualizado' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const addItemMutation = useMutation({
    mutationFn: async ({ promotionId, mlItemId, discountValue }: { promotionId: string; mlItemId: string; discountValue?: number }) => {
      const payload: Record<string, unknown> = { id: mlItemId };
      if (discountValue !== undefined) {
        payload.discount_type = 'PERCENTAGE';
        payload.discount_value = discountValue;
      }
      const res = await mlCall(`/seller-promotions/${promotionId}/items`, 'POST', payload, resellerUserId);
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao adicionar produto');
      return res.data;
    },
    onSuccess: () => toast({ title: 'Produto adicionado à promoção!' }),
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  const removeItemMutation = useMutation({
    mutationFn: async ({ promotionId, mlItemId }: { promotionId: string; mlItemId: string }) => {
      const res = await mlCall(`/seller-promotions/${promotionId}/items/${mlItemId}`, 'DELETE', undefined, resellerUserId);
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao remover produto');
    },
    onSuccess: () => toast({ title: 'Produto removido da promoção' }),
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  async function getPromotionItems(promotionId: string): Promise<MlPromotionItem[]> {
    const res = await mlCall(`/seller-promotions/${promotionId}/items`, 'GET', undefined, resellerUserId);
    return res?.data?.results ?? [];
  }

  return {
    promotions,
    isLoading,
    refetch,
    createPromotion: (data: CreatePromotionData) => createMutation.mutateAsync(data),
    startPromotion: (id: string) => updateStatusMutation.mutateAsync({ id, status: 'started' }),
    pausePromotion: (id: string) => updateStatusMutation.mutateAsync({ id, status: 'paused' }),
    finishPromotion: (id: string) => updateStatusMutation.mutateAsync({ id, status: 'finished' }),
    addItem: (promotionId: string, mlItemId: string, discountValue?: number) =>
      addItemMutation.mutateAsync({ promotionId, mlItemId, discountValue }),
    removeItem: (promotionId: string, mlItemId: string) =>
      removeItemMutation.mutateAsync({ promotionId, mlItemId }),
    getPromotionItems,
    isCreating: createMutation.isPending,
  };
}
