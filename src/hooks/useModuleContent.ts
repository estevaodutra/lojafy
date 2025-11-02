import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CourseModule, CourseLesson } from '@/types/courses';

export const useModuleContent = (moduleId?: string) => {
  const { data: module, isLoading: moduleLoading } = useQuery({
    queryKey: ['course-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          courses!inner(id, title)
        `)
        .eq('id', moduleId!)
        .single();

      if (error) throw error;
      return data as CourseModule & { courses: { id: string; title: string } };
    },
    enabled: !!moduleId,
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ['module-lessons', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('module_id', moduleId!)
        .eq('is_published', true)
        .order('position', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(lesson => ({
        ...lesson,
        attachments: Array.isArray(lesson.attachments) ? lesson.attachments as any : [],
      })) as any as CourseLesson[];
    },
    enabled: !!moduleId,
  });

  return {
    module,
    lessons,
    loading: moduleLoading || lessonsLoading,
  };
};
