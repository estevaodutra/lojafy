import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { useUserRole } from '@/hooks/useUserRole';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, Clock, GraduationCap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAccessLevelBadge } from '@/lib/courseAccess';
import type { CourseAccessLevel } from '@/lib/courseAccess';
import { toast } from 'sonner';

const CourseCatalog = () => {
  const { user } = useAuth();
  const { role } = useUserRole();
  const navigate = useNavigate();
  const { availableCourses, coursesLoading, enrollInCourse, isEnrolled } = useCourseEnrollment(user?.id);

  const handleEnroll = async (courseId: string, courseTitle: string) => {
    if (!user?.id) {
      toast.error('Você precisa estar logado para se matricular');
      return;
    }

    try {
      enrollInCourse({ userId: user.id, courseId });
      toast.success(`Matrícula realizada com sucesso em "${courseTitle}"!`);
      setTimeout(() => {
        navigate(`/minha-conta/aulas/${courseId}`);
      }, 1000);
    } catch (error) {
      console.error('Erro ao matricular:', error);
    }
  };

  if (coursesLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <Skeleton className="h-48 w-full rounded-t-lg" />
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">📚 Catálogo de Cursos</h1>
          <p className="text-muted-foreground">
            Descubra novos conhecimentos e desenvolva suas habilidades
          </p>
        </div>

        {/* Courses Grid */}
        {availableCourses && availableCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableCourses.map((course) => {
              const enrolled = isEnrolled(course.id);
              const accessBadge = getAccessLevelBadge(course.access_level as CourseAccessLevel);

              return (
                <Card key={course.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  {/* Thumbnail */}
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center rounded-t-lg">
                      <GraduationCap className="w-16 h-16 text-primary/40" />
                    </div>
                  )}

                  <CardHeader className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl line-clamp-2">{course.title}</CardTitle>
                      <span className="text-2xl shrink-0" title={accessBadge.label}>
                        {accessBadge.icon}
                      </span>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {course.description || 'Curso disponível para você'}
                    </CardDescription>

                    {/* Course Info */}
                    <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
                      {course.duration_hours && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{course.duration_hours}h</span>
                        </div>
                      )}
                      {course.level && (
                        <div className="capitalize">
                          {course.level === 'beginner' && 'Iniciante'}
                          {course.level === 'intermediate' && 'Intermediário'}
                          {course.level === 'advanced' && 'Avançado'}
                        </div>
                      )}
                    </div>

                    {course.instructor_name && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Por {course.instructor_name}
                      </p>
                    )}
                  </CardHeader>

                  <CardContent className="pt-0">
                    {enrolled ? (
                      <Button asChild className="w-full" variant="secondary">
                        <Link to={`/minha-conta/aulas/${course.id}`}>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Continuar Assistindo
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handleEnroll(course.id, course.title)}
                      >
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Matricular-se
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold">Nenhum curso disponível</h3>
                <p className="text-muted-foreground mt-2">
                  Não há cursos publicados disponíveis para o seu perfil no momento.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Link to My Courses */}
        <div className="flex justify-center pt-4">
          <Button variant="outline" asChild>
            <Link to="/minha-conta/aulas">
              <GraduationCap className="w-4 h-4 mr-2" />
              Ver Minhas Aulas
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CourseCatalog;
