import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCourseContent } from '@/hooks/useCourseContent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { SortableLessonItem } from '@/components/admin/SortableLessonItem';

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  const handleDragEnd = async (event: DragEndEvent, lessons: CourseLesson[]) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const sortedLessons = [...lessons].sort((a, b) => a.position - b.position);
    const oldIndex = sortedLessons.findIndex(l => l.id === active.id);
    const newIndex = sortedLessons.findIndex(l => l.id === over.id);
    
    const reorderedLessons = arrayMove(sortedLessons, oldIndex, newIndex);
    
    try {
      const updates = reorderedLessons.map((lesson, index) => 
        supabase
          .from('course_lessons')
          .update({ position: index })
          .eq('id', lesson.id)
      );
      
      await Promise.all(updates);
      
      toast.success('Ordem das aulas atualizada');
      queryClient.invalidateQueries({ queryKey: ['course-modules', courseId] });
    } catch (error: any) {
      toast.error(error.message || 'Erro ao reordenar aulas');
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
                      <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        modifiers={[restrictToVerticalAxis]}
                        onDragEnd={(event) => handleDragEnd(event, module.lessons || [])}
                      >
                        <SortableContext
                          items={(module.lessons || []).sort((a, b) => a.position - b.position).map(l => l.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2">
                            {(module.lessons || [])
                              .sort((a, b) => a.position - b.position)
                              .map((lesson) => (
                                <SortableLessonItem
                                  key={lesson.id}
                                  lesson={lesson}
                                  onEdit={handleEditLesson}
                                  onDelete={(id) => handleDeleteClick('lesson', id)}
                                />
                              ))}
                          </div>
                        </SortableContext>
                      </DndContext>
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
