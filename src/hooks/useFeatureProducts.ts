import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FeatureProduct {
  id: string;
  feature_id: string;
  produto_id: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  product_name: string;
  product_sku: string;
  product_price: number;
  product_image: string | null;
}

export const useFeatureProducts = (featureId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['feature-products', featureId],
    queryFn: async () => {
      if (!featureId) return [];
      const { data, error } = await supabase
        .from('feature_produtos')
        .select('*')
        .eq('feature_id', featureId)
        .order('ordem', { ascending: true });

      if (error) throw error;

      // Fetch product details for each
      const productIds = (data || []).map((fp: any) => fp.produto_id);
      if (productIds.length === 0) return [];

      const { data: productsData, error: pError } = await supabase
        .from('products')
        .select('id, name, sku, price, image_url')
        .in('id', productIds);

      if (pError) throw pError;

      const productMap = new Map((productsData || []).map((p: any) => [p.id, p]));

      return (data || []).map((fp: any) => {
        const p = productMap.get(fp.produto_id) || {};
        return {
          id: fp.id,
          feature_id: fp.feature_id,
          produto_id: fp.produto_id,
          ordem: fp.ordem,
          ativo: fp.ativo,
          created_at: fp.created_at,
          product_name: (p as any).name || 'Produto não encontrado',
          product_sku: (p as any).sku || '',
          product_price: (p as any).price || 0,
          product_image: (p as any).image_url || null,
        } as FeatureProduct;
      });
    },
    enabled: !!featureId,
  });

  const addProducts = useMutation({
    mutationFn: async ({ featureId, productIds }: { featureId: string; productIds: string[] }) => {
      const maxOrdem = (products || []).reduce((max, p) => Math.max(max, p.ordem), 0);
      const rows = productIds.map((pid, i) => ({
        feature_id: featureId,
        produto_id: pid,
        ordem: maxOrdem + i + 1,
      }));
      const { error } = await supabase.from('feature_produtos').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-products', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({ title: 'Sucesso', description: 'Produtos adicionados!' });
    },
    onError: (error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feature_produtos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-products', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({ title: 'Sucesso', description: 'Produto removido!' });
    },
  });

  const reorderProducts = useMutation({
    mutationFn: async (items: { id: string; ordem: number }[]) => {
      // Update each item's ordem
      for (const item of items) {
        const { error } = await supabase
          .from('feature_produtos')
          .update({ ordem: item.ordem })
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-products', featureId] });
    },
  });

  return {
    products: products || [],
    isLoading,
    addProducts,
    removeProduct,
    reorderProducts,
  };
};
