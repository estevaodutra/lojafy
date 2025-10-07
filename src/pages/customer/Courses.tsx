import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCourseEnrollment } from '@/hooks/useCourseEnrollment';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CourseProgressBar } from '@/components/courses/CourseProgressBar';
import { BookOpen, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function Courses() {
  const { user } = useAuth();
  const { enrollments, loading } = useCourseEnrollment(user?.id);
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');

  const filteredEnrollments = enrollments?.filter(enrollment => {
    if (filter === 'in_progress') return enrollment.progress_percentage > 0 && enrollment.progress_percentage < 100;
    if (filter === 'completed') return enrollment.progress_percentage === 100;
    return true;
  });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Skeleton className="h-12 w-64 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GraduationCap className="w-8 h-8" />
            Minhas Aulas
          </h1>
          <p className="text-muted-foreground mt-1">
            Continue aprendendo e desenvolva suas habilidades
          </p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList>
          <TabsTrigger value="all">Todos ({enrollments?.length || 0})</TabsTrigger>
          <TabsTrigger value="in_progress">
            Em Progresso ({enrollments?.filter(e => e.progress_percentage > 0 && e.progress_percentage < 100).length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Concluídos ({enrollments?.filter(e => e.progress_percentage === 100).length || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredEnrollments && filteredEnrollments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEnrollments.map((enrollment) => (
            <Card key={enrollment.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative">
                {enrollment.course?.thumbnail_url ? (
                  <img 
                    src={enrollment.course.thumbnail_url} 
                    alt={enrollment.course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-16 h-16 text-primary/30" />
                  </div>
                )}
              </div>
              <CardContent className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {enrollment.course?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {enrollment.course?.description}
                  </p>
                </div>

                <CourseProgressBar progress={enrollment.progress_percentage} />

                <Button asChild className="w-full">
                  <Link to={`/minha-conta/aulas/${enrollment.course_id}`}>
                    {enrollment.progress_percentage === 0 ? 'Iniciar Curso' : 'Continuar Assistindo'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
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
                  <h3 className="text-xl font-semibold">Nenhum curso encontrado</h3>
                  <p className="text-muted-foreground mt-2">
                    {filter === 'completed' 
                      ? 'Você ainda não concluiu nenhum curso'
                      : filter === 'in_progress'
                      ? 'Você não tem cursos em andamento'
                      : 'Você ainda não está matriculado em nenhum curso'}
                  </p>
                </div>
                <Button asChild>
                  <Link to="/minha-conta/catalogo-aulas">
                    Explorar Catálogo de Cursos
                  </Link>
                </Button>
              </div>
            </Card>
      )}
    </div>
  );
}
