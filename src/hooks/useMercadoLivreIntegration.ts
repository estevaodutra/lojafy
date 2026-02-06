import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PublishedProduct {
  id: string;
  product_id: string;
  ml_item_id: string | null;
  status: string;
  published_at: string;
}

export const useMercadoLivreIntegration = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [publishingProducts, setPublishingProducts] = useState<Set<string>>(new Set());

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

  // Mutation to publish product
  const publishProductMutation = useMutation({
    mutationFn: async ({ productId, addToStoreFirst }: { productId: string; addToStoreFirst?: () => Promise<void> }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');
      
      // Add to store first if needed
      if (addToStoreFirst) {
        await addToStoreFirst();
      }

      // Call the n8n webhook
      const response = await fetch(
        'https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: productId,
            user_id: user.id
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao publicar: ${errorText}`);
      }

      // Save the published record
      const { error: insertError } = await supabase
        .from('mercadolivre_published_products')
        .upsert({
          user_id: user.id,
          product_id: productId,
          status: 'published',
          published_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,product_id'
        });

      if (insertError) {
        console.error('Error saving published product:', insertError);
        throw new Error('Erro ao salvar registro de publicação');
      }

      return { productId };
    },
    onMutate: async ({ productId }) => {
      setPublishingProducts(prev => new Set(prev).add(productId));
    },
    onSuccess: ({ productId }) => {
      toast({
        title: 'Produto publicado!',
        description: 'O produto foi enviado para o Mercado Livre com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['ml-published-products'] });
    },
    onError: (error, { productId }) => {
      toast({
        title: 'Erro ao publicar',
        description: error instanceof Error ? error.message : 'Tente novamente mais tarde.',
        variant: 'destructive',
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
    return publishProductMutation.mutateAsync({ productId, addToStoreFirst });
  }, [publishProductMutation]);

  return {
    hasActiveIntegration: hasActiveIntegration ?? false,
    isLoading: isLoadingIntegration || isLoadingPublished,
    publishedProducts,
    isProductPublished,
    isProductPublishing,
    publishProduct,
  };
};
