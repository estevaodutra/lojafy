import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserFeature {
  feature_id: string;
  feature_slug: string;
  feature_nome: string;
  feature_icone: string;
  categoria: string;
  status: 'ativo' | 'trial' | 'expirado' | 'cancelado' | 'revogado';
  tipo_periodo: 'mensal' | 'anual' | 'vitalicio' | 'trial' | 'cortesia';
  data_inicio: string;
  data_expiracao: string | null;
  dias_restantes: number | null;
  atribuido_por: string | null;
  motivo: string | null;
}

export const useUserFeatures = (userId?: string) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  const { data: features, isLoading, refetch } = useQuery({
    queryKey: ['user-features', targetUserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_active_features', {
        _user_id: targetUserId,
      });

      if (error) {
        console.error('Error fetching user features:', error);
        return [];
      }

      return (data || []) as UserFeature[];
    },
    enabled: !!targetUserId,
  });

  const hasFeature = (slug: string) => {
    return features?.some((f) => f.feature_slug === slug) || false;
  };

  return {
    features: features || [],
    hasFeature,
    isLoading,
    refetch,
  };
};
