import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  excludeCourseIds: string[];
  onSuccess: () => void;
}

interface Course {
  id: string;
  title: string;
}

export const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  userId,
  excludeCourseIds,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);

  const { data: availableCourses, isLoading } = useQuery({
    queryKey: ['available-courses-for-user', excludeCourseIds],
    queryFn: async () => {
      let query = supabase
        .from('courses')
        .select('id, title')
        .eq('is_published', true)
        .order('title');

      if (excludeCourseIds.length > 0) {
        query = query.not('id', 'in', `(${excludeCourseIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Course[];
    },
    enabled: isOpen,
  });

  const addMutation = useMutation({
    mutationFn: async (courseIds: string[]) => {
      const enrollments = courseIds.map((courseId) => ({
        user_id: userId,
        course_id: courseId,
        progress_percentage: 0,
      }));

      const { error } = await supabase
        .from('course_enrollments')
        .insert(enrollments);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Curso(s) adicionado(s) com sucesso',
      });
      setSelectedCourses([]);
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar cursos. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId)
        ? prev.filter((id) => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSubmit = () => {
    if (selectedCourses.length > 0) {
      addMutation.mutate(selectedCourses);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedCourses([]);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Curso</DialogTitle>
          <DialogDescription>
            Selecione os cursos para matricular o usuário.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : !availableCourses || availableCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Usuário já está matriculado em todos os cursos disponíveis
            </p>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {availableCourses.map((course) => (
                <div
                  key={course.id}
                  className="flex items-center space-x-3 p-2 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    id={course.id}
                    checked={selectedCourses.includes(course.id)}
                    onCheckedChange={() => handleToggleCourse(course.id)}
                  />
                  <Label
                    htmlFor={course.id}
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    {course.title}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              selectedCourses.length === 0 ||
              addMutation.isPending ||
              !availableCourses ||
              availableCourses.length === 0
            }
          >
            {addMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adicionando...
              </>
            ) : (
              'Adicionar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
