import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLessonContent } from '@/hooks/useLessonContent';
import { useModuleContent } from '@/hooks/useModuleContent';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Download, FileText, Lock } from 'lucide-react';
import { CourseBreadcrumb } from '@/components/courses/CourseBreadcrumb';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function LessonViewer() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lesson, loading: lessonLoading } = useLessonContent(lessonId);
  const { lessons, loading: moduleLessonsLoading } = useModuleContent(lesson?.course_modules?.id);
  const { enrollments, canAccessCourse, loading: enrollmentLoading } = useCourseEnrollment(user?.id);
  
  const enrollment = enrollments?.find(e => e.course_id === lesson?.course_modules?.course_id);
  const { progress, markLessonComplete } = useCourseProgress(enrollment?.id);

  useDocumentTitle(lesson ? `${lesson.title}` : 'Visualizar Aula');

  const currentProgress = progress?.find(p => p.lesson_id === lessonId);
  const isCompleted = currentProgress?.is_completed || false;

  const currentIndex = lessons?.findIndex(l => l.id === lessonId) ?? -1;
  const previousLesson = currentIndex > 0 ? lessons?.[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && lessons ? lessons[currentIndex + 1] : null;

  const handleToggleComplete = () => {
    if (!enrollment || !user) {
      toast.error('Você precisa estar matriculado para marcar progresso');
      return;
    }

    markLessonComplete({
      lessonId: lessonId!,
      userId: user.id,
      enrollmentId: enrollment.id,
      isCompleted: !isCompleted,
    });
  };

  if (lessonLoading || moduleLessonsLoading || enrollmentLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-[500px] mb-6" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Aula não encontrada</h1>
        <Button asChild>
          <Link to="/minha-conta/academy">Voltar para Academy</Link>
        </Button>
      </div>
    );
  }

  // Verificar matrícula antes de exibir aula
  const courseId = lesson.course_modules?.course_id;
  if (courseId && !canAccessCourse(courseId)) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa estar matriculado neste curso para assistir esta aula.
        </p>
        <Button asChild>
          <Link to="/minha-conta/academy">Voltar para Academy</Link>
        </Button>
      </div>
    );
  }

  // Extract video embed URL from various sources
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    
    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    
    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    
    // Direct video URL
    if (url.match(/\.(mp4|webm|ogg)$/i)) {
      return url;
    }
    
    return url;
  };

  const embedUrl = getEmbedUrl(lesson.video_url);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <CourseBreadcrumb
        items={[
          { label: 'Academy', href: '/minha-conta/academy' },
          { label: lesson.course_modules.courses.title, href: `/minha-conta/curso/${lesson.course_modules.course_id}` },
          { label: lesson.course_modules.title, href: `/minha-conta/curso/${lesson.course_modules.course_id}/modulo/${lesson.course_modules.id}` },
          { label: lesson.title, current: true },
        ]}
      />

      <div className="mb-6">
        <Button variant="ghost" asChild>
          <Link to={`/minha-conta/curso/${lesson.course_modules.course_id}/modulo/${lesson.course_modules.id}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para Aulas
          </Link>
        </Button>
      </div>

      {/* Video Player */}
      {embedUrl && (
        <div className="aspect-video bg-black rounded-lg overflow-hidden mb-6">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Lesson Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{lesson.title}</CardTitle>
              {lesson.description && (
                <p className="text-muted-foreground">{lesson.description}</p>
              )}
            </div>
            {enrollment && (
              <div className="flex items-center gap-2 ml-4">
                <Checkbox
                  id="completed"
                  checked={isCompleted}
                  onCheckedChange={handleToggleComplete}
                />
                <label htmlFor="completed" className="text-sm font-medium cursor-pointer">
                  Marcar como concluída
                </label>
              </div>
            )}
          </div>
        </CardHeader>

        {lesson.content && (
          <CardContent>
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: lesson.content }} />
          </CardContent>
        )}
      </Card>

      {/* Attachments */}
      {lesson.attachments && lesson.attachments.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Download className="h-5 w-5" />
              Materiais de Apoio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lesson.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="flex-1 font-medium">{attachment.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {(attachment.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => previousLesson && navigate(`/minha-conta/aula/${previousLesson.id}`)}
          disabled={!previousLesson}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Aula Anterior
        </Button>

        <Button
          onClick={() => nextLesson && navigate(`/minha-conta/aula/${nextLesson.id}`)}
          disabled={!nextLesson}
        >
          Próxima Aula
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
