import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GraduationCap, Lock, PlayCircle, ShoppingCart } from 'lucide-react';
import { CourseProgressBar } from '@/components/courses/CourseProgressBar';
import { cn } from '@/lib/utils';

export default function Academy() {
  const { user } = useAuth();
  const { availableCourses, enrollments, loading, coursesLoading, isEnrolled, canAccessCourse } = useCourseEnrollment(user?.id);

  if (loading || coursesLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <Skeleton className="h-48 w-full" />
              <CardHeader>
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GraduationCap className="w-8 h-8" />
          Lojafy Academy
        </h1>
        <p className="text-muted-foreground">
          Desenvolva suas habilidades com nossos cursos especializados
        </p>
      </div>

      {!availableCourses || availableCourses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum curso disponível</h3>
            <p className="text-muted-foreground text-center">
              Novos cursos serão adicionados em breve.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableCourses.map((course) => {
            const enrolled = isEnrolled(course.id);
            const hasAccess = canAccessCourse(course.id);
            const isFreeForAll = course.access_level === 'all';
            const enrollment = enrollments?.find(e => e.course_id === course.id);

            return (
              <Card 
                key={course.id} 
                className={cn(
                  "flex flex-col overflow-hidden transition-all hover:shadow-lg",
                  enrolled && "border-green-500 border-2",
                  isFreeForAll && !enrolled && "border-blue-500 border-2"
                )}
              >
                {/* Thumbnail com overlay de cadeado */}
                <div className="relative aspect-video bg-muted">
                  {course.thumbnail_url ? (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <GraduationCap className="w-16 h-16 text-muted-foreground" />
                    </div>
                  )}
                  
                  {!hasAccess && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <Lock className="w-12 h-12 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>

                <CardHeader className="flex-1">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                    {enrolled ? (
                      <Badge className="bg-green-600 hover:bg-green-700 shrink-0">
                        🎓 Matriculado
                      </Badge>
                    ) : isFreeForAll ? (
                      <Badge className="bg-blue-600 hover:bg-blue-700 shrink-0">
                        🌐 Acesso Livre
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0">
                        🔒 Bloqueado
                      </Badge>
                    )}
                  </div>
                  
                  <CardDescription className="line-clamp-3">
                    {course.description || 'Sem descrição disponível'}
                  </CardDescription>

                  {/* Informações específicas por status */}
                  <div className="mt-4 space-y-2">
                    {course.instructor_name && (
                      <p className="text-sm text-muted-foreground">
                        Instrutor: {course.instructor_name}
                      </p>
                    )}
                    
                    {course.duration_hours && (
                      <p className="text-sm text-muted-foreground">
                        Duração: {course.duration_hours}h
                      </p>
                    )}

                    {course.level && (
                      <Badge variant="secondary" className="text-xs">
                        {course.level === 'beginner' && 'Iniciante'}
                        {course.level === 'intermediate' && 'Intermediário'}
                        {course.level === 'advanced' && 'Avançado'}
                      </Badge>
                    )}
                  </div>

                  {enrolled && enrollment ? (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-semibold">{enrollment.progress_percentage}%</span>
                      </div>
                      <CourseProgressBar progress={enrollment.progress_percentage} />
                    </div>
                  ) : (
                    <div className="mt-4">
                      <div className="text-3xl font-bold text-primary">
                        {course.price > 0 ? (
                          <>R$ {course.price.toFixed(2).replace('.', ',')}</>
                        ) : (
                          <span className="text-green-600">Gratuito</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  {hasAccess ? (
                    <Button 
                      asChild 
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Link to={`/minha-conta/aulas/${course.id}`}>
                        <PlayCircle className="w-4 h-4 mr-2" />
                        Assistir Aulas
                      </Link>
                    </Button>
                  ) : (
                    <Button 
                      asChild 
                      variant="outline" 
                      className="w-full"
                    >
                      <Link to={`/checkout/curso/${course.id}`}>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Adquirir Agora
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
