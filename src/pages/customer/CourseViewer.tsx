import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseContent } from '@/hooks/useCourseContent';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { isYouTubeUrl, getYouTubeEmbedUrl } from '@/lib/videoUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { LessonItem } from '@/components/courses/LessonItem';
import { CourseProgressBar } from '@/components/courses/CourseProgressBar';
import { ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function CourseViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { course, modules, loading: contentLoading } = useCourseContent(courseId);
  const { enrollments } = useCourseEnrollment(user?.id);
  const enrollment = enrollments?.find(e => e.course_id === courseId);
  const { progress, markLessonComplete } = useCourseProgress(enrollment?.id);
  
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Get current lesson details
  const currentModule = modules?.find(m => 
    m.lessons?.some(l => l.id === selectedLesson)
  );
  const currentLesson = currentModule?.lessons?.find(l => l.id === selectedLesson);
  const currentProgress = progress?.find(p => p.lesson_id === selectedLesson);

  // Select first lesson on load
  useEffect(() => {
    if (modules && modules.length > 0 && !selectedLesson) {
      const firstLesson = modules[0]?.lessons?.[0];
      if (firstLesson) {
        setSelectedLesson(firstLesson.id);
      }
    }
  }, [modules, selectedLesson]);

  // Load notes for current lesson
  useEffect(() => {
    if (currentProgress?.notes) {
      setNotes(currentProgress.notes);
    } else {
      setNotes('');
    }
  }, [currentProgress]);

  const handleLessonComplete = (isCompleted: boolean) => {
    if (!user || !enrollment || !selectedLesson) {
      toast.info('Para salvar progresso, matricule-se no curso.');
      return;
    }
    
    markLessonComplete({
      lessonId: selectedLesson,
      userId: user.id,
      enrollmentId: enrollment.id,
      isCompleted,
    });
  };

  const handleNextLesson = () => {
    if (!modules || !currentModule || !currentLesson) return;

    const currentLessonIndex = currentModule.lessons!.findIndex(l => l.id === selectedLesson);
    
    // Try next lesson in current module
    if (currentLessonIndex < currentModule.lessons!.length - 1) {
      setSelectedLesson(currentModule.lessons![currentLessonIndex + 1].id);
      return;
    }

    // Try first lesson of next module
    const currentModuleIndex = modules.findIndex(m => m.id === currentModule.id);
    if (currentModuleIndex < modules.length - 1) {
      const nextModule = modules[currentModuleIndex + 1];
      if (nextModule.lessons && nextModule.lessons.length > 0) {
        setSelectedLesson(nextModule.lessons[0].id);
      }
    }
  };

  const handlePreviousLesson = () => {
    if (!modules || !currentModule || !currentLesson) return;

    const currentLessonIndex = currentModule.lessons!.findIndex(l => l.id === selectedLesson);
    
    // Try previous lesson in current module
    if (currentLessonIndex > 0) {
      setSelectedLesson(currentModule.lessons![currentLessonIndex - 1].id);
      return;
    }

    // Try last lesson of previous module
    const currentModuleIndex = modules.findIndex(m => m.id === currentModule.id);
    if (currentModuleIndex > 0) {
      const prevModule = modules[currentModuleIndex - 1];
      if (prevModule.lessons && prevModule.lessons.length > 0) {
        setSelectedLesson(prevModule.lessons[prevModule.lessons.length - 1].id);
      }
    }
  };

  if (contentLoading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Check if user has access (enrolled OR course is free for all)
  const hasAccess = enrollment || course?.access_level === 'all';

  if (!hasAccess) {
    return (
      <Card className="container mx-auto p-12 m-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Acesso Negado</h2>
          <p className="text-muted-foreground">
            Você não tem acesso a este curso.
          </p>
          <Button onClick={() => navigate('/minha-conta/academy')}>
            Voltar para Lojafy Academy
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/minha-conta/academy')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="font-semibold">{course?.title}</h1>
              <p className="text-sm text-muted-foreground">{currentLesson?.title}</p>
            </div>
          </div>
          {enrollment && <CourseProgressBar progress={enrollment.progress_percentage} showLabel={false} />}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Module List */}
        <aside className="w-80 border-r bg-background">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {modules?.map((module) => (
                <div key={module.id}>
                  <h3 className="font-semibold mb-2">{module.title}</h3>
                  <div className="space-y-1">
                    {module.lessons?.map((lesson) => {
                      const lessonProgress = progress?.find(p => p.lesson_id === lesson.id);
                      return (
                        <LessonItem
                          key={lesson.id}
                          lesson={lesson}
                          isCompleted={lessonProgress?.is_completed}
                          isActive={selectedLesson === lesson.id}
                          onClick={() => setSelectedLesson(lesson.id)}
                        />
                      );
                    })}
                  </div>
                  <Separator className="my-4" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto p-6 max-w-4xl space-y-6">
            {/* Video Player */}
            {currentLesson?.video_url && (
              <Card>
                <CardContent className="p-0">
                  <div className="aspect-video bg-black">
                    {isYouTubeUrl(currentLesson.video_url) ? (
                      <iframe
                        className="w-full h-full"
                        src={getYouTubeEmbedUrl(currentLesson.video_url)}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video className="w-full h-full" controls>
                        <source src={currentLesson.video_url} type="video/mp4" />
                      </video>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lesson Title and Complete Checkbox */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{currentLesson?.title}</CardTitle>
                    {currentLesson?.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {currentLesson.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="completed"
                      checked={currentProgress?.is_completed || false}
                      onCheckedChange={handleLessonComplete}
                    />
                    <label htmlFor="completed" className="text-sm cursor-pointer">
                      Marcar como concluída
                    </label>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Tabs: Description, Attachments, Notes */}
            <Tabs defaultValue="description">
              <TabsList className="w-full">
                <TabsTrigger value="description" className="flex-1">Descrição</TabsTrigger>
                <TabsTrigger value="attachments" className="flex-1">
                  Anexos ({currentLesson?.attachments?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">Anotações</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    {currentLesson?.content ? (
                      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: currentLesson.content }} />
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhuma descrição disponível
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attachments" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    {currentLesson?.attachments && currentLesson.attachments.length > 0 ? (
                      <div className="space-y-2">
                        {currentLesson.attachments.map((attachment, index) => (
                          <a
                            key={index}
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                          >
                            <FileText className="w-5 h-5 text-primary" />
                            <div className="flex-1">
                              <p className="font-medium">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(attachment.size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                            <Download className="w-4 h-4 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-8">
                        Nenhum anexo disponível
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <Card>
                  <CardContent className="p-6">
                    <Textarea
                      placeholder="Faça suas anotações sobre esta aula..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={10}
                      className="resize-none"
                    />
                    <Button 
                      className="mt-4"
                      onClick={() => toast.success('Anotações salvas!')}
                    >
                      Salvar Anotações
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Navigation Buttons */}
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handlePreviousLesson}
                disabled={modules?.[0]?.lessons?.[0]?.id === selectedLesson}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Aula Anterior
              </Button>
              <Button
                onClick={handleNextLesson}
                disabled={
                  modules?.[modules.length - 1]?.lessons?.[
                    modules[modules.length - 1].lessons!.length - 1
                  ]?.id === selectedLesson
                }
              >
                Próxima Aula
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
