import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MlQuestion {
  id: number;
  text: string;
  status: 'UNANSWERED' | 'ANSWERED' | 'CLOSED_UNANSWERED' | 'UNDER_REVIEW';
  date_created: string;
  item_id: string;
  item_title?: string;
  item_thumbnail?: string;
  from: { id: number };
  answer?: {
    text: string;
    date_created: string;
    status: string;
  } | null;
}

export interface MlPack {
  id: number;
  status: string;
  date_created: string;
  last_updated: string;
  orders: Array<{ id: number }>;
  buyer: { id: number; nickname: string };
  seller: { id: number; nickname: string };
}

export interface MlMessage {
  id: string;
  from: { user_id: number };
  to: { user_id: number };
  text: { plain: string };
  message_date: { received: string; available: string };
  message_resources?: Array<{ id: string; name: string }>;
}

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

async function getMlUserId(userId: string): Promise<number | null> {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('ml_user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  return data?.ml_user_id ?? null;
}

// ── Perguntas (pré-venda) ────────────────────────────────────────────────────

export function useQuestions(
  filter: 'UNANSWERED' | 'ANSWERED' | 'all' = 'UNANSWERED',
  resellerUserId?: string
) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = resellerUserId ?? user?.id;

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['ml-questions', targetUserId, filter],
    queryFn: async () => {
      if (!targetUserId) return [];
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return [];

      const statusParam = filter === 'all' ? '' : `&status=${filter}`;
      const res = await mlCall(
        `/questions/search?seller_id=${mlUserId}${statusParam}&sort_fields=date_created&sort_types=DESC&limit=50`,
        'GET', undefined, resellerUserId
      );

      const questions: MlQuestion[] = res?.data?.questions ?? [];

      // Enriquecer com título e thumbnail do produto
      const itemIds = [...new Set(questions.map(q => q.item_id).filter(Boolean))];
      if (itemIds.length > 0) {
        const chunks: string[][] = [];
        for (let i = 0; i < itemIds.length; i += 20) chunks.push(itemIds.slice(i, i + 20));

        const itemMap = new Map<string, { title: string; thumbnail: string }>();
        for (const chunk of chunks) {
          const itemRes = await mlCall(`/items?ids=${chunk.join(',')}`, 'GET', undefined, resellerUserId);
          for (const d of (itemRes?.data ?? [])) {
            const item = d.body ?? d;
            if (item?.id) itemMap.set(String(item.id), { title: item.title, thumbnail: item.thumbnail });
          }
        }

        return questions.map(q => ({
          ...q,
          item_title: itemMap.get(String(q.item_id))?.title,
          item_thumbnail: itemMap.get(String(q.item_id))?.thumbnail,
        }));
      }

      return questions;
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // polling 1 min
    enabled: !!targetUserId,
  });

  const answerMutation = useMutation({
    mutationFn: async ({ questionId, text }: { questionId: number; text: string }) => {
      const res = await mlCall('/answers', 'POST', { question_id: questionId, text }, resellerUserId);
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao responder');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-questions', targetUserId] });
      toast({ title: 'Resposta enviada!' });
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao responder', description: e.message });
    },
  });

  const unansweredCount = (data ?? []).filter(q => q.status === 'UNANSWERED').length;

  return {
    questions: data ?? [],
    isLoading,
    refetch,
    unansweredCount,
    answerQuestion: (questionId: number, text: string) =>
      answerMutation.mutateAsync({ questionId, text }),
    isAnswering: answerMutation.isPending,
  };
}

// ── Conversas pós-venda (packs) ───────────────────────────────────────────────

export function usePacks(resellerUserId?: string) {
  const { user } = useAuth();
  const targetUserId = resellerUserId ?? user?.id;

  return useQuery({
    queryKey: ['ml-packs', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return [];

      const res = await mlCall(
        `/packs/search?seller_id=${mlUserId}&status=active&limit=30&sort_by=date_desc`,
        'GET', undefined, resellerUserId
      );
      return (res?.data?.results ?? []) as MlPack[];
    },
    staleTime: 60 * 1000,
    enabled: !!targetUserId,
  });
}

export function usePackMessages(packId: number | null, resellerUserId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetUserId = resellerUserId ?? user?.id;

  const { data, isLoading } = useQuery({
    queryKey: ['ml-pack-messages', packId, targetUserId],
    queryFn: async () => {
      if (!packId || !targetUserId) return [];
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return [];

      const res = await mlCall(
        `/messages/packs/${packId}/sellers/${mlUserId}`,
        'GET', undefined, resellerUserId
      );
      return (res?.data?.messages ?? []) as MlMessage[];
    },
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000, // polling 30s
    enabled: !!packId && !!targetUserId,
  });

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!packId || !targetUserId) throw new Error('No pack selected');
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) throw new Error('ML not connected');

      const res = await mlCall(
        `/messages/packs/${packId}/sellers/${mlUserId}`,
        'POST',
        { text: { plain: text } },
        resellerUserId
      );
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao enviar');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ml-pack-messages', packId, targetUserId] });
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao enviar mensagem', description: e.message });
    },
  });

  return {
    messages: data ?? [],
    isLoading,
    sendMessage: (text: string) => sendMutation.mutateAsync(text),
    isSending: sendMutation.isPending,
  };
}

// Hook para contagem de não lidas (para badge no menu)
export function useMlUnreadCount(resellerUserId?: string) {
  const { user } = useAuth();
  const targetUserId = resellerUserId ?? user?.id;

  const { data } = useQuery({
    queryKey: ['ml-unread-count', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return 0;
      const mlUserId = await getMlUserId(targetUserId);
      if (!mlUserId) return 0;

      const res = await mlCall(
        `/questions/search?seller_id=${mlUserId}&status=UNANSWERED&limit=1`,
        'GET', undefined, resellerUserId
      );
      return res?.data?.total ?? 0;
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // polling 2 min
    enabled: !!targetUserId,
  });

  return data ?? 0;
}
