import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LessonWithCourse {
  lesson_id: string;
  lesson_title: string;
  module_id: string;
  module_title: string;
  course_id: string;
  course_title: string;
}

export const useAllLessons = () => {
  return useQuery({
    queryKey: ['all-published-lessons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select(`
          id,
          title,
          module_id,
          course_modules!inner(
            id,
            title,
            course_id,
            courses!inner(
              id,
              title
            )
          )
        `)
        .eq('is_published', true)
        .eq('course_modules.is_published', true)
        .eq('course_modules.courses.is_published', true)
        .order('title', { ascending: true });

      if (error) throw error;

      // Transform nested structure to flat list
      const lessons: LessonWithCourse[] = (data || []).map((lesson: any) => ({
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        module_id: lesson.course_modules.id,
        module_title: lesson.course_modules.title,
        course_id: lesson.course_modules.courses.id,
        course_title: lesson.course_modules.courses.title,
      }));

      return lessons;
    },
  });
};
