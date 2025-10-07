import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Course, CourseModule } from '@/types/courses';

export const useCourseContent = (courseId?: string) => {
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId!)
        .single();

      if (error) throw error;
      return data as Course;
    },
    enabled: !!courseId,
  });

  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ['course-modules', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          *,
          lessons:course_lessons(*)
        `)
        .eq('course_id', courseId!)
        .order('position', { ascending: true });

      if (error) throw error;
      
      // Sort lessons within each module and parse attachments
      return (data as any[]).map(module => ({
        ...module,
        lessons: (module.lessons || []).map((lesson: any) => ({
          ...lesson,
          attachments: Array.isArray(lesson.attachments) ? lesson.attachments : [],
        })).sort((a: any, b: any) => a.position - b.position),
      })) as CourseModule[];
    },
    enabled: !!courseId,
  });

  return {
    course,
    modules,
    loading: courseLoading || modulesLoading,
    refetch: () => {
      // Can be used to manually refresh data
    },
  };
};
