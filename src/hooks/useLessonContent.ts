import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CourseLesson } from '@/types/courses';

export const useLessonContent = (lessonId?: string) => {
  // Query 1: fetch lesson by ID (simple, no nested joins)
  const { data: lessonData, isLoading: lessonLoading, error: lessonError } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_lessons')
        .select('*')
        .eq('id', lessonId!)
        .maybeSingle();

      if (error) {
        console.error('[useLessonContent] Erro ao buscar aula:', error.code, error.message);
        throw error;
      }

      if (!data) {
        console.warn('[useLessonContent] Aula não encontrada para ID:', lessonId);
        return null;
      }

      return {
        ...data,
        attachments: Array.isArray(data.attachments) ? data.attachments as any : [],
      } as any as CourseLesson;
    },
    enabled: !!lessonId,
  });

  // Query 2: fetch module + course info using module_id from lesson
  const moduleId = lessonData?.module_id;
  const { data: moduleData, isLoading: moduleLoading } = useQuery({
    queryKey: ['lesson-module', moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_modules')
        .select(`
          id,
          title,
          course_id,
          courses!inner(id, title)
        `)
        .eq('id', moduleId!)
        .maybeSingle();

      if (error) {
        console.error('[useLessonContent] Erro ao buscar módulo:', error.code, error.message);
        throw error;
      }

      return data as { id: string; title: string; course_id: string; courses: { id: string; title: string } } | null;
    },
    enabled: !!moduleId,
  });

  // Combine lesson + module data
  const lesson = lessonData && moduleData ? {
    ...lessonData,
    course_modules: moduleData,
  } as CourseLesson & {
    course_modules: {
      id: string;
      title: string;
      course_id: string;
      courses: { id: string; title: string };
    };
  } : undefined;

  return {
    lesson,
    loading: lessonLoading || (!!lessonData && moduleLoading),
    error: lessonError,
  };
};
