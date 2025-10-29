import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Search } from 'lucide-react';

export const AcademyProgress = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const { data: progressData, isLoading } = useQuery({
    queryKey: ['academy-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          id,
          progress_percentage,
          completed_at,
          enrolled_at,
          profiles:user_id (
            first_name,
            last_name,
            role
          ),
          courses:course_id (
            title
          )
        `)
        .order('enrolled_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredData = progressData?.filter((enrollment: any) => {
    const profile = enrollment.profiles;
    const course = enrollment.courses;
    const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.toLowerCase();
    const courseTitle = course?.title?.toLowerCase() || '';
    const search = searchTerm.toLowerCase();

    return fullName.includes(search) || courseTitle.includes(search);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Progresso dos Alunos</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar aluno ou curso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!filteredData || filteredData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma matrícula registrada ainda'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de Matrícula</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((enrollment: any) => {
                  const profile = enrollment.profiles;
                  const course = enrollment.courses;
                  const fullName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Sem nome';

                  return (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">{fullName}</TableCell>
                      <TableCell>{course?.title || 'Curso não encontrado'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {profile?.role === 'customer' && 'Cliente'}
                          {profile?.role === 'reseller' && 'Revendedor'}
                          {profile?.role === 'supplier' && 'Fornecedor'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(enrollment.enrolled_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-secondary rounded-full h-2 max-w-[100px]">
                            <div
                              className="bg-primary h-2 rounded-full transition-all"
                              style={{ width: `${enrollment.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground min-w-[40px]">
                            {enrollment.progress_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={enrollment.completed_at ? 'default' : 'secondary'}>
                          {enrollment.completed_at ? 'Concluído' : 'Em Progresso'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
