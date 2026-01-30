import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Trash2, GraduationCap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { useToast } from '@/hooks/use-toast';
import { useAllCourses } from '@/hooks/useAllCourses';

interface EnrollmentProfile {
  first_name: string | null;
  last_name: string | null;
  role: string | null;
}

interface EnrollmentCourse {
  id: string;
  title: string;
}

interface Enrollment {
  id: string;
  user_id: string;
  course_id: string;
  enrolled_at: string | null;
  progress_percentage: number | null;
  completed_at: string | null;
  profiles: EnrollmentProfile | null;
  course: EnrollmentCourse | null;
}

const ITEMS_PER_PAGE = 20;

const roleLabels: Record<string, string> = {
  customer: 'Cliente',
  reseller: 'Revendedor',
  supplier: 'Fornecedor',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const roleBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  customer: 'secondary',
  reseller: 'default',
  supplier: 'outline',
  admin: 'default',
  super_admin: 'default',
};

export const AllEnrollmentsTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [courseFilter, setCourseFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingEnrollment, setDeletingEnrollment] = useState<Enrollment | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: courses } = useAllCourses();

  const { data: enrollmentsData, isLoading } = useQuery({
    queryKey: ['all-enrollments', currentPage, searchTerm, courseFilter],
    queryFn: async () => {
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      let query = supabase
        .from('course_enrollments')
        .select(`
          id,
          user_id,
          course_id,
          enrolled_at,
          progress_percentage,
          completed_at,
          expires_at,
          course:courses (id, title)
        `, { count: 'exact' })
        .order('enrolled_at', { ascending: false });

      if (courseFilter !== 'all') {
        query = query.eq('course_id', courseFilter);
      }

      const { data: enrollmentsRaw, count, error } = await query.range(offset, offset + ITEMS_PER_PAGE - 1);

      if (error) throw error;

      // Fetch profiles for all user_ids
      const userIds = [...new Set((enrollmentsRaw || []).map(e => e.user_id))];
      
      let profilesMap: Record<string, EnrollmentProfile> = {};
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, role')
          .in('user_id', userIds);
        
        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.user_id] = {
              first_name: p.first_name,
              last_name: p.last_name,
              role: p.role,
            };
            return acc;
          }, {} as Record<string, EnrollmentProfile>);
        }
      }

      // Combine data
      const enrollments: Enrollment[] = (enrollmentsRaw || []).map((e) => ({
        id: e.id,
        user_id: e.user_id,
        course_id: e.course_id,
        enrolled_at: e.enrolled_at,
        progress_percentage: e.progress_percentage,
        completed_at: e.completed_at,
        profiles: profilesMap[e.user_id] || null,
        course: e.course as EnrollmentCourse | null,
      }));

      // Filter by search term on the client side (for name/course search)
      let filteredData = enrollments;
      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filteredData = filteredData.filter((enrollment) => {
          const fullName = `${enrollment.profiles?.first_name || ''} ${enrollment.profiles?.last_name || ''}`.toLowerCase();
          const courseTitle = enrollment.course?.title?.toLowerCase() || '';
          return fullName.includes(lowerSearch) || courseTitle.includes(lowerSearch);
        });
      }

      return {
        enrollments: filteredData,
        totalCount: count || 0,
      };
    },
  });

  const deleteEnrollmentMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from('course_enrollments')
        .delete()
        .eq('id', enrollmentId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Matrícula cancelada',
        description: 'O aluno foi desmatriculado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['all-enrollments'] });
      setDeletingEnrollment(null);
    },
    onError: (error) => {
      toast({
        title: 'Erro ao desmatricular',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const totalPages = Math.ceil((enrollmentsData?.totalCount || 0) / ITEMS_PER_PAGE);
  const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, enrollmentsData?.totalCount || 0);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleCourseFilterChange = (value: string) => {
    setCourseFilter(value);
    setCurrentPage(1);
  };

  const renderPaginationItems = () => {
    const items = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => setCurrentPage(1)}
            isActive={currentPage === 1}
            className="cursor-pointer"
          >
            1
          </PaginationLink>
        </PaginationItem>
      );

      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis-start">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => setCurrentPage(i)}
              isActive={currentPage === i}
              className="cursor-pointer"
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }

      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis-end">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }

      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink
            onClick={() => setCurrentPage(totalPages)}
            isActive={currentPage === totalPages}
            className="cursor-pointer"
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      );
    }

    return items;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por aluno ou curso..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={courseFilter} onValueChange={handleCourseFilterChange}>
          <SelectTrigger className="w-full sm:w-[250px]">
            <SelectValue placeholder="Filtrar por curso" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os cursos</SelectItem>
            {courses?.map((course) => (
              <SelectItem key={course.course_id} value={course.course_id}>
                {course.course_title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Matrículas ({enrollmentsData?.totalCount || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando matrículas...
            </div>
          ) : enrollmentsData?.enrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma matrícula encontrada.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data de Matrícula</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollmentsData?.enrollments.map((enrollment) => {
                    const fullName = `${enrollment.profiles?.first_name || ''} ${enrollment.profiles?.last_name || ''}`.trim() || 'Sem nome';
                    const role = enrollment.profiles?.role || 'customer';
                    const progress = enrollment.progress_percentage || 0;
                    const isCompleted = enrollment.completed_at !== null;

                    return (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">{fullName}</TableCell>
                        <TableCell>{enrollment.course?.title || 'Curso removido'}</TableCell>
                        <TableCell>
                          <Badge variant={roleBadgeVariants[role] || 'secondary'}>
                            {roleLabels[role] || role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {enrollment.enrolled_at
                            ? format(new Date(enrollment.enrolled_at), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={progress} className="h-2 flex-1" />
                            <span className="text-sm text-muted-foreground w-10">
                              {progress}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={isCompleted ? 'success' : 'secondary'}>
                            {isCompleted ? 'Concluído' : 'Em Progresso'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingEnrollment(enrollment)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {startItem}-{endItem} de {enrollmentsData?.totalCount} matrículas
                  </p>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {renderPaginationItems()}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingEnrollment} onOpenChange={() => setDeletingEnrollment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar desmatrícula</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desmatricular{' '}
              <strong>
                {deletingEnrollment?.profiles?.first_name} {deletingEnrollment?.profiles?.last_name}
              </strong>{' '}
              do curso <strong>{deletingEnrollment?.course?.title}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e todo o progresso do aluno será perdido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEnrollment && deleteEnrollmentMutation.mutate(deletingEnrollment.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desmatricular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
