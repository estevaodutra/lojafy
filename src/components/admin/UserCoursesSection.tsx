import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AddCourseModal } from './AddCourseModal';

interface CourseEnrollment {
  id: string;
  course_id: string;
  progress_percentage: number;
  enrolled_at: string;
  completed_at: string | null;
  course: {
    id: string;
    title: string;
    thumbnail_url: string | null;
  };
}

interface UserCoursesSectionProps {
  userId: string;
}

export const UserCoursesSection: React.FC<UserCoursesSectionProps> = ({ userId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<CourseEnrollment | null>(null);

  const { data: enrollments, isLoading } = useQuery({
    queryKey: ['user-course-enrollments', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          course_id,
          progress_percentage,
          enrolled_at,
          completed_at,
          course:courses (id, title, thumbnail_url)
        `)
        .eq('user_id', userId)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data as unknown as CourseEnrollment[];
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-course-enrollments', userId] });
      toast({
        title: 'Sucesso',
        description: 'Matrícula removida com sucesso',
      });
      setRemoveDialogOpen(false);
      setSelectedEnrollment(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar cursos. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleRemoveClick = (enrollment: CourseEnrollment) => {
    setSelectedEnrollment(enrollment);
    setRemoveDialogOpen(true);
  };

  const handleConfirmRemove = () => {
    if (selectedEnrollment) {
      removeMutation.mutate(selectedEnrollment.id);
    }
  };

  const enrolledCourseIds = enrollments?.map((e) => e.course_id) || [];

  if (isLoading) {
    return (
      <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <>
      <div className="mt-3 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">
            Cursos Matriculados ({enrollments?.length || 0})
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddModalOpen(true)}
            className="h-7 text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar
          </Button>
        </div>

        {!enrollments || enrollments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            Nenhum curso matriculado
          </p>
        ) : (
          <div className="space-y-2">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center justify-between p-2 bg-background border rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {enrollment.course.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress
                        value={enrollment.progress_percentage}
                        className="h-1.5 w-20"
                      />
                      <span className="text-xs text-muted-foreground">
                        {enrollment.progress_percentage}%
                      </span>
                      {enrollment.completed_at && (
                        <Badge variant="secondary" className="text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => handleRemoveClick(enrollment)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCourseModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        userId={userId}
        excludeCourseIds={enrolledCourseIds}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['user-course-enrollments', userId] });
        }}
      />

      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Matrícula</AlertDialogTitle>
            <AlertDialogDescription>
              Remover matrícula do curso "{selectedEnrollment?.course.title}"?
              O progresso será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={removeMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeMutation.isPending ? 'Removendo...' : 'Remover'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
