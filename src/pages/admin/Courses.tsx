import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Users, TrendingUp, Edit, MoreVertical } from 'lucide-react';
import { Course } from '@/types/courses';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

export default function Courses() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('courses');

  const { data: courses, isLoading } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          modules:course_modules(count),
          enrollments:course_enrollments(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  const totalCourses = courses?.length || 0;
  const publishedCourses = courses?.filter(c => c.is_published).length || 0;
  const totalEnrollments = courses?.reduce((acc, c: any) => acc + (c.enrollments?.[0]?.count || 0), 0) || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-8 h-8" />
            Gerenciamento de Cursos
          </h1>
          <p className="text-muted-foreground mt-1">
            Crie e gerencie cursos, módulos e aulas
          </p>
        </div>
        <Button size="lg">
          <Plus className="w-4 h-4 mr-2" />
          Novo Curso
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="statistics">Estatísticas</TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Cursos
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCourses}</div>
                <p className="text-xs text-muted-foreground">
                  {publishedCourses} publicados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Alunos Matriculados
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEnrollments}</div>
                <p className="text-xs text-muted-foreground">
                  Total de matrículas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Taxa de Conclusão
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">--</div>
                <p className="text-xs text-muted-foreground">
                  Média geral
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Course List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses?.map((course: any) => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative">
                  {course.thumbnail_url ? (
                    <img 
                      src={course.thumbnail_url} 
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-16 h-16 text-primary/30" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="secondary" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/super-admin/aulas/${course.id}/conteudo`)}>
                          <BookOpen className="w-4 h-4 mr-2" />
                          Gerenciar Conteúdo
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/super-admin/aulas/${course.id}/matriculas`)}>
                          <Users className="w-4 h-4 mr-2" />
                          Matrículas
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg line-clamp-1">{course.title}</CardTitle>
                    <Badge variant={course.is_published ? 'default' : 'secondary'}>
                      {course.is_published ? 'Publicado' : 'Rascunho'}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {course.description || 'Sem descrição'}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{course.modules?.[0]?.count || 0} módulos</span>
                    <span>{course.enrollments?.[0]?.count || 0} alunos</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {courses?.length === 0 && (
            <Card className="p-12">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <BookOpen className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">Nenhum curso criado</h3>
                  <p className="text-muted-foreground mt-2">
                    Crie seu primeiro curso para começar
                  </p>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Curso
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="statistics">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas em Desenvolvimento</CardTitle>
              <CardDescription>
                Em breve você terá acesso a análises detalhadas de seus cursos
              </CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
              <p>Gráficos e métricas serão exibidos aqui</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
