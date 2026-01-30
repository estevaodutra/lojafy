import { useParams, Link } from 'react-router-dom';
import { useModuleContent } from '@/hooks/useModuleContent';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Lock } from 'lucide-react';
import { LessonCard } from '@/components/courses/LessonCard';
import { CourseBreadcrumb } from '@/components/courses/CourseBreadcrumb';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ModuleLessons() {
  const { courseId, moduleId } = useParams();
  const { user } = useAuth();
  const { module, lessons, loading } = useModuleContent(moduleId);
  const { enrollments, canAccessCourse, loading: enrollmentLoading } = useCourseEnrollment(user?.id);
  
  const enrollment = enrollments?.find(e => e.course_id === courseId);
  const { progress } = useCourseProgress(enrollment?.id);

  useDocumentTitle(module ? `${module.title} - Aulas` : 'Aulas do Módulo');

  if (loading || enrollmentLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-[300px]" />
          ))}
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Módulo não encontrado</h1>
        <Button asChild>
          <Link to="/minha-conta/academy">Voltar para Academy</Link>
        </Button>
      </div>
    );
  }

  // Verificar matrícula antes de exibir aulas
  if (courseId && !canAccessCourse(courseId)) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa estar matriculado neste curso para acessar as aulas.
        </p>
        <Button asChild>
          <Link to="/minha-conta/academy">Voltar para Academy</Link>
        </Button>
      </div>
    );
  }

  const completedLessonIds = progress?.filter(p => p.is_completed).map(p => p.lesson_id) || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <CourseBreadcrumb
        items={[
          { label: 'Academy', href: '/minha-conta/academy' },
          { label: module.courses?.title || 'Curso', href: `/minha-conta/curso/${courseId}` },
          { label: module.title, current: true },
        ]}
      />

      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to={`/minha-conta/curso/${courseId}`}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para Módulos
          </Link>
        </Button>
        
        <h1 className="text-4xl font-bold mb-2">{module.title}</h1>
        {module.description && (
          <p className="text-muted-foreground text-lg">{module.description}</p>
        )}
      </div>

      {!lessons || lessons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Este módulo ainda não possui aulas publicadas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lessons.map((lesson) => (
            <LessonCard 
              key={lesson.id} 
              lesson={lesson}
              isCompleted={completedLessonIds.includes(lesson.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
