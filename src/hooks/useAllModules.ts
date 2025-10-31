import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ModuleWithCourse {
  module_id: string;
  module_title: string;
  course_id: string;
  course_title: string;
}

export const useAllModules = () => {
  return useQuery({
    queryKey: ['all-published-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          id,
          title,
          course_id,
          courses!inner(
            id,
            title
          )
        `)
        .eq('is_published', true)
        .eq('courses.is_published', true)
        .order('title', { ascending: true });

      if (error) throw error;

      const modules: ModuleWithCourse[] = (data || []).map((module: any) => ({
        module_id: module.id,
        module_title: module.title,
        course_id: module.courses.id,
        course_title: module.courses.title,
      }));

      return modules;
    },
  });
};
