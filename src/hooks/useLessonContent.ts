import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CourseLesson } from '@/types/courses';

export const useLessonContent = (lessonId?: string) => {
  const { data: lesson, isLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select(`
          *,
          course_modules!inner(
            id,
            title,
            course_id,
            courses!inner(id, title)
          )
        `)
        .eq('id', lessonId!)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        attachments: Array.isArray(data.attachments) ? data.attachments as any : [],
      } as any as CourseLesson & {
        course_modules: {
          id: string;
          title: string;
          course_id: string;
          courses: { id: string; title: string };
        };
      };
    },
    enabled: !!lessonId,
  });

  return {
    lesson,
    loading: isLoading,
  };
};
