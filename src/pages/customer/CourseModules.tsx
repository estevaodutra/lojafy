import { useParams, Link, Navigate } from 'react-router-dom';
import { useCourseContent } from '@/hooks/useCourseContent';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, Lock } from 'lucide-react';
import { ModuleCard } from '@/components/courses/ModuleCard';
import { CourseBreadcrumb } from '@/components/courses/CourseBreadcrumb';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function CourseModules() {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { course, modules, loading } = useCourseContent(courseId);
  const { canAccessCourse, loading: enrollmentLoading } = useCourseEnrollment(user?.id);

  useDocumentTitle(course ? `${course.title} - Módulos` : 'Módulos do Curso');

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

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Curso não encontrado</h1>
        <Button asChild>
          <Link to="/minha-conta/academy">Voltar para Academy</Link>
        </Button>
      </div>
    );
  }

  // Verificar matrícula antes de exibir módulos
  if (courseId && !canAccessCourse(courseId)) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-6">
          Você precisa estar matriculado neste curso para acessar o conteúdo.
        </p>
        <Button asChild>
          <Link to="/minha-conta/academy">Voltar para Academy</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <CourseBreadcrumb
        items={[
          { label: 'Academy', href: '/minha-conta/academy' },
          { label: course.title, current: true },
        ]}
      />

      <div className="mb-8">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/minha-conta/academy">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Voltar para Academy
          </Link>
        </Button>
        
        <h1 className="text-4xl font-bold mb-2">{course.title}</h1>
        {course.description && (
          <p className="text-muted-foreground text-lg">{course.description}</p>
        )}
      </div>

      {!modules || modules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            Este curso ainda não possui módulos publicados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} courseId={courseId!} />
          ))}
        </div>
      )}
    </div>
  );
}
