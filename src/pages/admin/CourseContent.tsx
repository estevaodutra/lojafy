import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseContent } from '@/hooks/useCourseContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Edit, Trash2, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { CourseModuleForm } from '@/components/admin/CourseModuleForm';
import { CourseLessonForm } from '@/components/admin/CourseLessonForm';
import { CourseModule, CourseLesson } from '@/types/courses';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function CourseContent() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { course, modules, loading } = useCourseContent(courseId);
  
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<CourseModule | null>(null);
  const [editingLesson, setEditingLesson] = useState<CourseLesson | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'module' | 'lesson'; id: string } | null>(null);
  const [expandedModules, setExpandedModules] = useState<string[]>([]);

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleCreateModule = () => {
    setEditingModule(null);
    setModuleDialogOpen(true);
  };

  const handleEditModule = (module: CourseModule) => {
    setEditingModule(module);
    setModuleDialogOpen(true);
  };

  const handleCreateLesson = (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setEditingLesson(null);
    setLessonDialogOpen(true);
  };

  const handleEditLesson = (lesson: CourseLesson) => {
    setSelectedModuleId(lesson.module_id);
    setEditingLesson(lesson);
    setLessonDialogOpen(true);
  };

  const handleDeleteClick = (type: 'module' | 'lesson', id: string) => {
    setDeleteTarget({ type, id });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { error } = await supabase
        .from(deleteTarget.type === 'module' ? 'course_modules' : 'course_lessons')
        .delete()
        .eq('id', deleteTarget.id);

      if (error) throw error;

      toast.success(deleteTarget.type === 'module' ? 'Módulo excluído' : 'Aula excluída');
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir');
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
  };

  const handleMoveLesson = async (
    lesson: CourseLesson, 
    direction: 'up' | 'down', 
    allLessons: CourseLesson[]
  ) => {
    const sortedLessons = [...allLessons].sort((a, b) => a.position - b.position);
    const currentIndex = sortedLessons.findIndex(l => l.id === lesson.id);
    
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === sortedLessons.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetLesson = sortedLessons[targetIndex];

    try {
      const { error: error1 } = await supabase
        .from('course_lessons')
        .update({ position: targetLesson.position })
        .eq('id', lesson.id);

      const { error: error2 } = await supabase
        .from('course_lessons')
        .update({ position: lesson.position })
        .eq('id', targetLesson.id);

      if (error1 || error2) throw error1 || error2;

      toast.success('Ordem atualizada');
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao mover aula');
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Curso não encontrado</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/aulas')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">Gerenciar conteúdo do curso</p>
          </div>
        </div>
        <Button onClick={handleCreateModule}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Módulo
        </Button>
      </div>

      <div className="space-y-4">
        {!modules || modules.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">Nenhum módulo criado ainda</p>
              <Button onClick={handleCreateModule}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Módulo
              </Button>
            </CardContent>
          </Card>
        ) : (
          modules.map((module) => (
            <Card key={module.id}>
              <Collapsible
                open={expandedModules.includes(module.id)}
                onOpenChange={() => toggleModule(module.id)}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <div className="flex items-center gap-4 flex-1">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon">
                        {expandedModules.includes(module.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {module.title}
                        <Badge variant={module.is_published ? 'default' : 'secondary'}>
                          {module.is_published ? 'Publicado' : 'Rascunho'}
                        </Badge>
                      </CardTitle>
                      {module.description && (
                        <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditModule(module)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick('module', module.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleCreateLesson(module.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Aula
                    </Button>
                  </div>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    {!module.lessons || module.lessons.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-2">Nenhuma aula neste módulo</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCreateLesson(module.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Primeira Aula
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {module.lessons.map((lesson) => (
                          <div
                            key={lesson.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{lesson.title}</span>
                                <Badge variant={lesson.is_published ? 'default' : 'secondary'} className="text-xs">
                                  {lesson.is_published ? 'Publicado' : 'Rascunho'}
                                </Badge>
                              </div>
                              {lesson.description && (
                                <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
                              )}
                              {lesson.duration_minutes && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Duração: {lesson.duration_minutes} minutos
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleMoveLesson(lesson, 'up', module.lessons || [])}
                                  disabled={module.lessons?.sort((a, b) => a.position - b.position)[0]?.id === lesson.id}
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleMoveLesson(lesson, 'down', module.lessons || [])}
                                  disabled={module.lessons?.sort((a, b) => a.position - b.position)[module.lessons.length - 1]?.id === lesson.id}
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="h-3 w-3" />
                                </Button>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditLesson(lesson)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick('lesson', lesson.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      <CourseModuleForm
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        courseId={courseId!}
        module={editingModule}
        onSuccess={handleSuccess}
      />

      <CourseLessonForm
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        moduleId={selectedModuleId!}
        lesson={editingLesson}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este {deleteTarget?.type === 'module' ? 'módulo' : 'aula'}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
