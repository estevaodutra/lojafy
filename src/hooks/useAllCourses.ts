import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CourseOption {
  course_id: string;
  course_title: string;
}

export const useAllCourses = () => {
  return useQuery({
    queryKey: ['all-published-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('is_published', true)
        .order('title', { ascending: true });

      if (error) throw error;

      const courses: CourseOption[] = (data || []).map((course) => ({
        course_id: course.id,
        course_title: course.title,
      }));

      return courses;
    },
  });
};
