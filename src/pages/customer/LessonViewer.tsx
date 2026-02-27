import DOMPurify from 'dompurify';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useLessonContent } from '@/hooks/useLessonContent';
import { useModuleContent } from '@/hooks/useModuleContent';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ChevronLeft, ChevronRight, Download, FileText, Lock, CheckCircle2 } from 'lucide-react';
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
  const totalLessons = lessons?.length ?? 0;
  const currentLessonNumber = currentIndex >= 0 ? currentIndex + 1 : 0;

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

  const handleNavigate = (targetLessonId: string) => {
    navigate(`/minha-conta/aula/${targetLessonId}`);
    window.scrollTo(0, 0);
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
        <h1 className="text-2xl font-bold mb-4">Não foi possível carregar a aula</h1>
        <p className="text-muted-foreground mb-6">
          Isso pode acontecer se sua sessão expirou ou se houve um problema de conexão.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
          <Button asChild>
            <Link to="/minha-conta/academy">Voltar para Academy</Link>
          </Button>
        </div>
      </div>
    );
  }

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

  // Extract video embed URL
  const getEmbedUrl = (url?: string) => {
    if (!url) return null;
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (youtubeMatch) return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^\/]+)/);
    if (driveMatch) return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    if (url.match(/\.(mp4|webm|ogg)$/i)) return url;
    return url;
  };

  const embedUrl = getEmbedUrl(lesson.video_url);
  const isLastLesson = !nextLesson;

  return (
    <div className="container mx-auto px-4 py-6 sm:px-6 sm:py-8 max-w-3xl">
      {/* Header: Voltar + Nome do Curso */}
      <div className="mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
          <Link to={`/minha-conta/curso/${lesson.course_modules.course_id}/modulo/${lesson.course_modules.id}`}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar para Aulas
          </Link>
        </Button>
        <h1 className="text-lg sm:text-xl font-semibold text-foreground">
          {lesson.course_modules.courses.title}
        </h1>
      </div>

      <Separator className="mb-6" />

      {/* Indicador "Aula X de Y" + Título */}
      <div className="mb-5">
        {totalLessons > 0 && (
          <p className="text-sm text-muted-foreground mb-1">
            Aula {currentLessonNumber} de {totalLessons}
          </p>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
          {lesson.title}
        </h2>
      </div>

      {/* Video Player */}
      {embedUrl && (
        <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-sm mb-5">
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Descrição da aula */}
      {lesson.description && (
        <p className="text-muted-foreground mb-5">
          {lesson.description}
        </p>
      )}

      {/* Conteúdo HTML */}
      {lesson.content && (
        <div className="prose prose-sm max-w-none mb-5">
          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(lesson.content) }} />
        </div>
      )}

      {/* Checkbox concluída */}
      {enrollment && (
        <div
          className={`border rounded-lg p-3 sm:p-4 mb-6 flex items-center gap-3 cursor-pointer transition-colors ${
            isCompleted ? 'border-primary/30 bg-primary/5' : 'hover:bg-accent'
          }`}
          onClick={handleToggleComplete}
        >
          <Checkbox
            id="completed"
            checked={isCompleted}
            onCheckedChange={handleToggleComplete}
            className="pointer-events-none"
          />
          <label htmlFor="completed" className="text-sm font-medium cursor-pointer flex items-center gap-2">
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Aula concluída
              </>
            ) : (
              'Marcar aula como concluída'
            )}
          </label>
        </div>
      )}

      {/* Attachments */}
      {lesson.attachments && lesson.attachments.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Download className="h-5 w-5" />
              Materiais de Apoio
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
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

      {/* Navegação entre aulas */}
      <div className="flex flex-col sm:flex-row gap-3 sm:justify-between mt-8">
        {previousLesson ? (
          <button
            onClick={() => handleNavigate(previousLesson.id)}
            className="flex items-center gap-3 p-4 rounded-lg border hover:bg-accent transition-colors text-left flex-1"
          >
            <ChevronLeft className="h-5 w-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Aula Anterior</p>
              <p className="text-sm font-medium">{previousLesson.title}</p>
            </div>
          </button>
        ) : (
          <div className="flex-1" />
        )}

        {nextLesson ? (
          <button
            onClick={() => handleNavigate(nextLesson.id)}
            className="flex items-center justify-end gap-3 p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-right flex-1"
          >
            <div>
              <p className="text-xs opacity-80">Próxima Aula</p>
              <p className="text-sm font-medium">{nextLesson.title}</p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0" />
          </button>
        ) : (
          <button
            onClick={() => navigate(`/minha-conta/curso/${lesson.course_modules.course_id}`)}
            className="flex items-center justify-end gap-3 p-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-right flex-1"
          >
            <div>
              <p className="text-xs opacity-80">Fim do módulo</p>
              <p className="text-sm font-medium">Concluir Curso</p>
            </div>
            <CheckCircle2 className="h-5 w-5 shrink-0" />
          </button>
        )}
      </div>
    </div>
  );
}
