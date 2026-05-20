import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MlVariant {
  id: string;
  user_id: string;
  product_id: string;
  ml_item_id: string | null;
  variant_title: string;
  variant_description: string | null;
  price: number | null;
  status: 'draft' | 'published' | 'paused' | 'closed';
  permalink: string | null;
  visits: number;
  sales: number;
  last_synced_at: string | null;
  created_at: string;
}

export interface CreateVariantData {
  product_id: string;
  variant_title: string;
  variant_description?: string;
  price?: number;
}

async function mlProxyCall(mlPath: string, method = 'GET', payload?: unknown) {
  const { data, error } = await supabase.functions.invoke('ml-proxy', {
    body: { ml_path: mlPath, method, payload },
  });
  if (error) throw error;
  return data;
}

export function useMlVariants(productId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['ml-variants', user?.id, productId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase
        .from('ml_listing_variants')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (productId) query = query.eq('product_id', productId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as MlVariant[];
    },
    enabled: !!user?.id,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['ml-variants', user?.id] });

  // Criar variante (salvar no banco como draft)
  const createMutation = useMutation({
    mutationFn: async (data: CreateVariantData) => {
      const { data: created, error } = await supabase
        .from('ml_listing_variants')
        .insert({ user_id: user!.id, ...data, status: 'draft' })
        .select()
        .single();
      if (error) throw error;
      return created;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Variação criada!' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  // Publicar variante no ML
  const publishMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const variant = variants.find(v => v.id === variantId);
      if (!variant) throw new Error('Variante não encontrada');

      // Buscar produto completo
      const { data: product } = await supabase
        .from('products')
        .select('*, categories(name), subcategories(name)')
        .eq('id', variant.product_id)
        .single();

      const { data: marketplaceData } = await supabase
        .from('product_marketplace_data')
        .select('*')
        .eq('product_id', variant.product_id)
        .eq('marketplace', 'mercadolivre')
        .maybeSingle();

      // Chamar ml-publish-product com título e descrição customizados
      const { data: publishRes, error } = await supabase.functions.invoke('ml-publish-product', {
        body: {
          product: {
            ...product,
            name: variant.variant_title,             // título customizado
            description: variant.variant_description ?? product?.description,
          },
          reseller_price: variant.price ?? null,
          marketplace_data: marketplaceData ?? null,
          user_id: user!.id,
          ml_item_id: variant.ml_item_id,           // re-ativar se já existir
        },
      });

      if (error) {
        let errorMessage = error.message;
        let cause = '';
        try {
          if ('context' in error && typeof error.context === 'object' && error.context !== null) {
            const errorBody = await (error.context as Response).json();
            if (errorBody?.error) {
              errorMessage = errorBody.error;
            }
            if (Array.isArray(errorBody?.cause)) {
              cause = errorBody.cause.map((c: any) => c.message || JSON.stringify(c)).join(', ');
            }
          }
        } catch (e) {
          console.error('Error parsing edge function error body:', e);
        }
        throw new Error(cause ? `${errorMessage} — cause: ${cause}` : errorMessage);
      }

      if (!publishRes?.success) {
        const cause = publishRes?.cause?.map((c: any) => c.message).join(', ');
        throw new Error(publishRes?.error ?? 'Erro ao publicar' + (cause ? `: ${cause}` : ''));
      }

      // Atualizar variante no banco
      const { error: updateError } = await supabase
        .from('ml_listing_variants')
        .update({
          ml_item_id: publishRes.ml_item_id,
          permalink: publishRes.permalink,
          status: 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId);

      if (updateError) throw updateError;
      return publishRes;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Variação publicada no ML!' });
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao publicar', description: e.message }),
  });

  // Pausar variante no ML
  const pauseMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const variant = variants.find(v => v.id === variantId);
      if (!variant?.ml_item_id) throw new Error('Anúncio não publicado');

      const res = await mlProxyCall(`/items/${variant.ml_item_id}`, 'PUT', { status: 'paused' });
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao pausar');

      await supabase
        .from('ml_listing_variants')
        .update({ status: 'paused', updated_at: new Date().toISOString() })
        .eq('id', variantId);
    },
    onSuccess: () => { invalidate(); toast({ title: 'Variação pausada' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  // Ativar variante pausada
  const activateMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const variant = variants.find(v => v.id === variantId);
      if (!variant?.ml_item_id) throw new Error('Anúncio não publicado');

      const res = await mlProxyCall(`/items/${variant.ml_item_id}`, 'PUT', { status: 'active' });
      if (res.status >= 400) throw new Error(res.data?.message ?? 'Erro ao ativar');

      await supabase
        .from('ml_listing_variants')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', variantId);
    },
    onSuccess: () => { invalidate(); toast({ title: 'Variação ativada' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  // Deletar variante (do banco, não do ML)
  const deleteMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase
        .from('ml_listing_variants')
        .delete()
        .eq('id', variantId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast({ title: 'Variação removida' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro', description: e.message }),
  });

  // Sincronizar estatísticas (visitas e vendas) do ML
  const syncStatsMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const variant = variants.find(v => v.id === variantId);
      if (!variant?.ml_item_id) return;

      const res = await mlProxyCall(`/items/${variant.ml_item_id}`);
      if (res.status >= 400) throw new Error('Erro ao buscar stats');

      const item = res.data;
      await supabase
        .from('ml_listing_variants')
        .update({
          visits: item.health ?? 0,
          sales: item.sold_quantity ?? 0,
          status: item.status === 'active' ? 'published' : item.status === 'paused' ? 'paused' : 'closed',
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', variantId);
    },
    onSuccess: () => { invalidate(); toast({ title: 'Stats atualizadas!' }); },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao sincronizar', description: e.message }),
  });

  // Publicar TODAS as variantes draft de uma vez
  const publishAllDraftsMutation = useMutation({
    mutationFn: async (variantIds: string[]) => {
      const results = await Promise.allSettled(
        variantIds.map(id => publishMutation.mutateAsync(id))
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      return { total: variantIds.length, failed };
    },
    onSuccess: ({ total, failed }) => {
      if (failed > 0) {
        toast({ variant: 'destructive', title: `${failed} de ${total} falharam` });
      } else {
        toast({ title: `${total} variações publicadas!` });
      }
      invalidate();
    },
  });

  return {
    variants,
    isLoading,
    createVariant: (data: CreateVariantData) => createMutation.mutateAsync(data),
    publishVariant: (id: string) => publishMutation.mutateAsync(id),
    pauseVariant: (id: string) => pauseMutation.mutateAsync(id),
    activateVariant: (id: string) => activateMutation.mutateAsync(id),
    deleteVariant: (id: string) => deleteMutation.mutateAsync(id),
    syncStats: (id: string) => syncStatsMutation.mutateAsync(id),
    publishAllDrafts: (ids: string[]) => publishAllDraftsMutation.mutateAsync(ids),
    isPublishing: publishMutation.isPending,
    isPublishingAll: publishAllDraftsMutation.isPending,
  };
}
