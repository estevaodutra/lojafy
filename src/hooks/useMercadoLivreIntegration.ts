import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import React from 'react';

interface PublishedProduct {
  id: string;
  product_id: string;
  ml_item_id: string | null;
  permalink: string | null;
  status: string;
  published_at: string;
}

export const useMercadoLivreIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publishingProducts, setPublishingProducts] = useState<Set<string>>(new Set());
  const [unpublishingProducts, setUnpublishingProducts] = useState<Set<string>>(new Set());

  // Check if user has active ML integration
  const { data: hasActiveIntegration, isLoading: isLoadingIntegration } = useQuery({
    queryKey: ['ml-integration-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase
        .from('mercadolivre_integrations')
        .select('is_active')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('Error checking ML integration:', error);
        return false;
      }
      
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Fetch published products for this user
  const { data: publishedProducts = [], isLoading: isLoadingPublished } = useQuery({
    queryKey: ['ml-published-products', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('mercadolivre_published_products')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching published products:', error);
        return [];
      }
      
      return data as PublishedProduct[];
    },
    enabled: !!user?.id && hasActiveIntegration === true,
  });

  // Create a Set for fast lookup
  const publishedProductIds = new Set(
    publishedProducts
      .filter(p => p.status === 'published')
      .map(p => p.product_id)
  );

  const isProductPublished = useCallback((productId: string): boolean => {
    return publishedProductIds.has(productId);
  }, [publishedProductIds]);

  const isProductPublishing = useCallback((productId: string): boolean => {
    return publishingProducts.has(productId);
  }, [publishingProducts]);

  const isProductUnpublishing = useCallback((productId: string): boolean => {
    return unpublishingProducts.has(productId);
  }, [unpublishingProducts]);

  const getProductPermalink = useCallback((productId: string): string | null => {
    const published = publishedProducts.find(p => p.product_id === productId && p.status === 'published');
    return published?.permalink || null;
  }, [publishedProducts]);

  // Mutation to publish product
  const publishProductMutation = useMutation({
    mutationFn: async ({ productId, addToStoreFirst }: { productId: string; addToStoreFirst?: () => Promise<void> }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      // Add to store first if needed
      if (addToStoreFirst) {
        await addToStoreFirst();
      }

      // 1. Buscar dados completos do produto
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(`
          *,
          category:categories!category_id(id, name),
          subcategory:subcategories(id, name)
        `)
        .eq('id', productId)
        .single();

      if (productError || !productData) {
        throw new Error('Produto não encontrado');
      }

      // 1.5. Buscar preço customizado do revendedor (Seu Preço)
      const { data: resellerProduct } = await supabase
        .from('reseller_products')
        .select('custom_price')
        .eq('reseller_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      // 2. Buscar dados específicos do marketplace
      const { data: marketplaceData } = await supabase
        .from('product_marketplace_data')
        .select('*')
        .eq('product_id', productId)
        .eq('marketplace', 'mercadolivre')
        .maybeSingle();

      // 4. Buscar ml_item_id existente (para re-ativar anúncio pausado)
      const { data: existingPublished } = await supabase
        .from('mercadolivre_published_products')
        .select('ml_item_id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      // 5. Publicar direto na ML API via edge function (sem n8n)
      const publishPayload = {
        product: productData,
        reseller_price: resellerProduct?.custom_price ?? null,
        marketplace_data: marketplaceData ?? null,
        user_id: user.id,
        ml_item_id: existingPublished?.ml_item_id ?? null,
      };

      const { data: publishResponse, error: publishError } = await supabase.functions.invoke('ml-publish-product', {
        body: publishPayload,
      });

      if (publishError) {
        let errorMessage = publishError.message;
        let cause = '';
        try {
          if ('context' in publishError && typeof publishError.context === 'object' && publishError.context !== null) {
            const errorBody = await (publishError.context as Response).json();
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
        const fullMsg = cause ? `${errorMessage} — cause: ${cause}` : errorMessage;
        throw new Error(`Erro ao publicar: ${fullMsg}`);
      }

      if (!publishResponse?.success) {
        const cause = publishResponse?.cause?.map((c: any) => c.message).join(', ');
        throw new Error(publishResponse?.error ?? 'Erro desconhecido ao publicar no Mercado Livre' + (cause ? `: ${cause}` : ''));
      }

      const permalink: string | null = publishResponse.permalink ?? null;
      const mlItemId: string | null = publishResponse.ml_item_id ?? null;

      // Save the published record with permalink and ml_item_id
      const { error: insertError } = await supabase
        .from('mercadolivre_published_products')
        .upsert({
          user_id: user.id,
          product_id: productId,
          status: 'published',
          published_at: new Date().toISOString(),
          ml_item_id: mlItemId,
          permalink: permalink,
        }, {
          onConflict: 'user_id,product_id'
        });

      if (insertError) {
        console.error('Error saving published product:', insertError);
        throw new Error('Erro ao salvar registro de publicação');
      }

      return { productId, permalink };
    },
    onSuccess: ({ productId, permalink }) => {
      const toastOptions: any = {
        title: 'Seu Produto foi Publicado no Mercado Livre',
        description: 'Obs: o anúncio ainda pode não estar público por verificação do marketplace. Esse processo pode levar até 30min.',
        duration: 15000,
      };

      if (permalink) {
        toastOptions.action = React.createElement(
          ToastAction,
          {
            altText: 'Ver Anúncio',
            onClick: () => window.open(permalink, '_blank'),
          },
          'Ver Anúncio'
        );
      }

      toast(toastOptions);
      queryClient.invalidateQueries({ queryKey: ['ml-published-products'] });
    },
    onError: (error, { productId }) => {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';

      // Extrair causas específicas do ML (ex: atributo obrigatório, categoria inválida)
      const causesMatch = message.match(/cause: (.+)/);
      const causes = causesMatch ? causesMatch[1] : null;

      toast({
        title: 'Erro ao publicar no Mercado Livre',
        description: causes
          ? `${message.replace(/ — cause:.+/, '')}\n\nDetalhes: ${causes}`
          : message,
        variant: 'destructive',
        duration: 10000,
      });
    },
    onSettled: (_, __, { productId }) => {
      setPublishingProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    },
  });

  const publishProduct = useCallback(async (productId: string, addToStoreFirst?: () => Promise<void>) => {
    // Fire-and-forget: add to publishing set, show quick toast, don't await
    setPublishingProducts(prev => new Set(prev).add(productId));
    
    toast({
      title: 'Publicando em segundo plano...',
      description: 'Você será notificado quando o anúncio estiver pronto.',
      duration: 3000,
    });

    // Fire mutation without awaiting
    publishProductMutation.mutate({ productId, addToStoreFirst });
  }, [publishProductMutation, toast]);

  // Mutation to unpublish product
  const unpublishProductMutation = useMutation({
    mutationFn: async ({ productId }: { productId: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar ml_item_id para pausar o anúncio no ML
      const { data: published } = await supabase
        .from('mercadolivre_published_products')
        .select('ml_item_id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .single();

      if (published?.ml_item_id) {
        const { data: unpubResponse, error: unpubError } = await supabase.functions.invoke('ml-publish-product', {
          body: { action: 'unpublish', ml_item_id: published.ml_item_id, user_id: user.id },
        });

        if (unpubError || !unpubResponse?.success) {
          throw new Error(unpubError?.message ?? unpubResponse?.error ?? 'Erro ao pausar anúncio no Mercado Livre');
        }
      }

      // Atualizar status local (limpar ml_item_id e permalink para permitir nova publicação)
      const { error: updateError } = await supabase
        .from('mercadolivre_published_products')
        .update({ status: 'unpublished', ml_item_id: null, permalink: null })
        .eq('user_id', user.id)
        .eq('product_id', productId);

      if (updateError) throw new Error('Erro ao atualizar status de publicação');
      return { productId };
    },
    onMutate: async ({ productId }) => {
      setUnpublishingProducts(prev => new Set(prev).add(productId));
    },
    onSuccess: () => {
      toast({
        title: 'Produto despublicado!',
        description: 'O anúncio foi removido do Mercado Livre.',
      });
      queryClient.invalidateQueries({ queryKey: ['ml-published-products'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao despublicar',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    },
    onSettled: (_, __, { productId }) => {
      setUnpublishingProducts(prev => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    },
  });

  const unpublishProduct = useCallback(async (productId: string) => {
    return unpublishProductMutation.mutateAsync({ productId });
  }, [unpublishProductMutation]);

  return {
    hasActiveIntegration: hasActiveIntegration ?? false,
    isLoading: isLoadingIntegration || isLoadingPublished,
    publishedProducts,
    isProductPublished,
    isProductPublishing,
    isProductUnpublishing,
    getProductPermalink,
    publishProduct,
    unpublishProduct,
  };
};
