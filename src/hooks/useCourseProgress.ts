import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LessonProgress } from '@/types/courses';
import { toast } from 'sonner';

export const useCourseProgress = (enrollmentId?: string) => {
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['lesson-progress', enrollmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('enrollment_id', enrollmentId!);

      if (error) throw error;
      return data as LessonProgress[];
    },
    enabled: !!enrollmentId,
  });

  const updateProgressMutation = useMutation({
    mutationFn: async ({ 
      lessonId, 
      userId, 
      enrollmentId,
      watchTime, 
      lastPosition 
    }: { 
      lessonId: string;
      userId: string;
      enrollmentId: string;
      watchTime?: number;
      lastPosition?: number;
    }) => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert({
          lesson_id: lessonId,
          user_id: userId,
          enrollment_id: enrollmentId,
          watch_time_seconds: watchTime,
          last_position_seconds: lastPosition,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollments'] });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async ({ 
      lessonId, 
      userId, 
      enrollmentId,
      isCompleted 
    }: { 
      lessonId: string;
      userId: string;
      enrollmentId: string;
      isCompleted: boolean;
    }) => {
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert({
          lesson_id: lessonId,
          user_id: userId,
          enrollment_id: enrollmentId,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
      queryClient.invalidateQueries({ queryKey: ['course-enrollments'] });
      if (variables.isCompleted) {
        toast.success('Aula concluída!');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar progresso');
    },
  });

  const completedLessons = progress?.filter(p => p.is_completed) || [];

  return {
    progress,
    loading: isLoading,
    completedLessons,
    updateLessonProgress: updateProgressMutation.mutate,
    markLessonComplete: markCompleteMutation.mutate,
  };
};
