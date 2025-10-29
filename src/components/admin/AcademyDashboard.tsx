import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Users, TrendingUp, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export const AcademyDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['academy-stats'],
    queryFn: async () => {
      // Total de cursos
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, is_published');
      if (coursesError) throw coursesError;

      // Total de matrículas ativas
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_enrollments')
        .select('id, progress_percentage, completed_at');
      if (enrollmentsError) throw enrollmentsError;

      // Calcular estatísticas
      const totalCourses = courses?.length || 0;
      const publishedCourses = courses?.filter(c => c.is_published).length || 0;
      const totalEnrollments = enrollments?.length || 0;
      const activeEnrollments = enrollments?.filter(e => !e.completed_at).length || 0;
      const completedEnrollments = enrollments?.filter(e => e.completed_at).length || 0;
      const avgProgress = enrollments && enrollments.length > 0
        ? Math.round(enrollments.reduce((acc, e) => acc + e.progress_percentage, 0) / enrollments.length)
        : 0;

      return {
        totalCourses,
        publishedCourses,
        totalEnrollments,
        activeEnrollments,
        completedEnrollments,
        avgProgress
      };
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Cursos
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCourses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.publishedCourses || 0} publicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Matrículas Ativas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeEnrollments || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalEnrollments || 0} matrículas totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conclusão Média
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgProgress || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Média de progresso
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Cursos Concluídos
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedEnrollments || 0}</div>
            <p className="text-xs text-muted-foreground">
              Matrículas finalizadas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visão Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cursos Publicados</span>
              <div className="flex items-center gap-2">
                <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ 
                      width: `${stats?.totalCourses ? (stats.publishedCourses / stats.totalCourses) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium min-w-[60px] text-right">
                  {stats?.publishedCourses}/{stats?.totalCourses}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cursos Concluídos</span>
              <div className="flex items-center gap-2">
                <div className="w-48 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ 
                      width: `${stats?.totalEnrollments ? (stats.completedEnrollments / stats.totalEnrollments) * 100 : 0}%` 
                    }}
                  />
                </div>
                <span className="text-sm font-medium min-w-[60px] text-right">
                  {stats?.completedEnrollments}/{stats?.totalEnrollments}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
