import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Feature {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  categoria: string;
  ordem_exibicao: number;
  preco_mensal: number | null;
  preco_anual: number | null;
  preco_vitalicio: number | null;
  trial_dias: number;
  ativo: boolean;
  visivel_catalogo: boolean;
  roles_permitidas: string[];
  requer_features: string[];
  metadata: Record<string, any>;
  gerencia_produtos: boolean;
  limite_produtos: number | null;
  created_at: string;
  updated_at: string;
  user_count?: number;
  product_count?: number;
}

export const useFeatures = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all features
  const { data: features, isLoading } = useQuery({
    queryKey: ['features'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('features')
        .select('*')
        .order('categoria', { ascending: true })
        .order('ordem_exibicao', { ascending: true });

      if (error) throw error;

      // Get user count and product count for each feature
      const featuresWithCount = await Promise.all(
        (data || []).map(async (feature) => {
          const { data: count } = await supabase.rpc('get_feature_user_count', {
            _feature_id: feature.id,
          });
          let productCount = 0;
          if (feature.gerencia_produtos) {
            const { count: pCount } = await supabase
              .from('feature_produtos')
              .select('*', { count: 'exact', head: true })
              .eq('feature_id', feature.id)
              .eq('ativo', true);
            productCount = pCount || 0;
          }
          return { ...feature, user_count: count || 0, product_count: productCount };
        })
      );

      return featuresWithCount as Feature[];
    },
  });

  // Create/Update feature
  const upsertFeature = useMutation({
    mutationFn: async (feature: Partial<Feature>) => {
      if (feature.id) {
        const { data, error } = await supabase
          .from('features')
          .update({
            nome: feature.nome,
            descricao: feature.descricao,
            icone: feature.icone,
            categoria: feature.categoria,
            ordem_exibicao: feature.ordem_exibicao,
            preco_mensal: feature.preco_mensal,
            preco_anual: feature.preco_anual,
            preco_vitalicio: feature.preco_vitalicio,
            trial_dias: feature.trial_dias,
            ativo: feature.ativo,
            visivel_catalogo: feature.visivel_catalogo,
            gerencia_produtos: feature.gerencia_produtos,
            limite_produtos: feature.limite_produtos,
          })
          .eq('id', feature.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('features')
          .insert({
            slug: feature.slug!,
            nome: feature.nome!,
            descricao: feature.descricao,
            icone: feature.icone,
            categoria: feature.categoria!,
            ordem_exibicao: feature.ordem_exibicao,
            preco_mensal: feature.preco_mensal,
            preco_anual: feature.preco_anual,
            preco_vitalicio: feature.preco_vitalicio,
            trial_dias: feature.trial_dias,
            ativo: feature.ativo,
            visivel_catalogo: feature.visivel_catalogo,
            gerencia_produtos: feature.gerencia_produtos,
            limite_produtos: feature.limite_produtos,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({
        title: 'Sucesso',
        description: 'Feature salva com sucesso!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar feature: ' + error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle feature active status
  const toggleFeatureActive = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('features')
        .update({ ativo })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({
        title: 'Sucesso',
        description: 'Status alterado com sucesso!',
      });
    },
  });

  // Get metrics
  const metrics = {
    totalAtivas: features?.filter((f) => f.ativo).length || 0,
    totalUsuarios: features?.reduce((sum, f) => sum + (f.user_count || 0), 0) || 0,
    totalInativas: features?.filter((f) => !f.ativo).length || 0,
  };

  // Group by category
  const featuresByCategory = features?.reduce((acc, feature) => {
    if (!acc[feature.categoria]) {
      acc[feature.categoria] = [];
    }
    acc[feature.categoria].push(feature);
    return acc;
  }, {} as Record<string, Feature[]>);

  return {
    features: features || [],
    featuresByCategory: featuresByCategory || {},
    metrics,
    isLoading,
    upsertFeature,
    toggleFeatureActive,
  };
};
