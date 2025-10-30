import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface KnowledgeBaseItem {
  id: string;
  category: string;
  subcategory: string | null;
  target_audience: string;
  title: string;
  content: string;
  keywords: string[];
  priority: number;
}

export const usePublicKnowledgeBase = (targetAudience: 'customer' | 'reseller' | 'all' = 'customer') => {
  return useQuery({
    queryKey: ['public-knowledge-base', targetAudience],
    queryFn: async () => {
      let query = supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('active', true)
        .order('priority', { ascending: false });

      if (targetAudience !== 'all') {
        query = query.or(`target_audience.eq.${targetAudience},target_audience.eq.all`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data as KnowledgeBaseItem[];
    }
  });
};
