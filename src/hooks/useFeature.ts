import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const useFeature = (featureSlug: string) => {
  const { user, profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';

  const { data, isLoading } = useQuery({
    queryKey: ['user-feature', user?.id, featureSlug],
    queryFn: async () => {
      if (isSuperAdmin) return true;
      
      const { data, error } = await supabase.rpc('user_has_feature', {
        _user_id: user?.id,
        _feature_slug: featureSlug,
      });
      
      if (error) {
        console.error('Error checking feature:', error);
        return false;
      }
      
      return data || false;
    },
    enabled: !!user?.id && !!featureSlug,
  });

  return {
    hasFeature: isSuperAdmin || data || false,
    isLoading: !isSuperAdmin && isLoading,
  };
};
