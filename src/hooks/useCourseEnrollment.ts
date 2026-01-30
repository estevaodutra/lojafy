import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CourseEnrollment, Course } from '@/types/courses';
import { toast } from 'sonner';
import { useUserRole } from './useUserRole';

export const useCourseEnrollment = (userId?: string) => {
  const queryClient = useQueryClient();
  const { role } = useUserRole();

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['course-enrollments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          *,
          course:courses(*)
        `)
        .eq('user_id', userId!)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data as CourseEnrollment[];
    },
    enabled: !!userId,
  });

  const enrollMutation = useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .insert({ user_id: userId, course_id: courseId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollments'] });
      toast.success('Matrícula realizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao realizar matrícula');
    },
  });

  const unenrollMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-enrollments'] });
      toast.success('Matrícula cancelada');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao cancelar matrícula');
    },
  });

  // Query for available courses based on access_level
  const { data: availableCourses, isLoading: coursesLoading } = useQuery({
    queryKey: ['available-courses', role],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .order('position', { ascending: true });
      
      // Filter by access_level based on user role
      if (role && role !== 'super_admin') {
        query = query.or(`access_level.eq.all,access_level.eq.${role}`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as Course[];
    },
    enabled: !!role,
  });

  const isEnrolled = (courseId: string) => {
    return enrollments?.some(e => e.course_id === courseId) ?? false;
  };

  const canAccessCourse = (courseId: string) => {
    // Acesso SOMENTE via matrícula - access_level controla apenas visibilidade
    return isEnrolled(courseId);
  };

  return {
    enrollments,
    availableCourses,
    loading: isLoading,
    coursesLoading,
    enrollInCourse: enrollMutation.mutate,
    unenrollFromCourse: unenrollMutation.mutate,
    isEnrolled,
    canAccessCourse,
  };
};
