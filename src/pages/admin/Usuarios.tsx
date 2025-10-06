import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ImpersonationButton } from '@/components/admin/ImpersonationButton';
import { UserRole } from '@/hooks/useUserRole';
import { Search, X } from 'lucide-react';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

const Usuarios = () => {
  const { toast } = useToast();
  const [updatingUsers, setUpdatingUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_users_with_email');
      
      if (error) throw error;
      return data;
    }
  });

  const { paginatedUsers, totalPages, totalFiltered } = useMemo(() => {
    if (!users) return { paginatedUsers: [], totalPages: 0, totalFiltered: 0 };
    
    // Aplicar filtro
    let filtered = users;
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim();
      filtered = users.filter(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.toLowerCase();
        const email = (user.email || '').toLowerCase();
        return fullName.includes(search) || email.includes(search);
      });
    }
    
    // Calcular paginação
    const total = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginated = filtered.slice(startIndex, endIndex);
    
    return {
      paginatedUsers: paginated,
      totalPages: total,
      totalFiltered: filtered.length
    };
  }, [users, searchTerm, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUsers(prev => [...prev, userId]);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole as 'customer' | 'admin' | 'super_admin' | 'supplier' | 'reseller' })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Role do usuário atualizado com sucesso',
      });

      refetch();
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar role do usuário',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'supplier':
        return 'secondary';
      case 'reseller':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Admin',
      supplier: 'Fornecedor',
      reseller: 'Revendedor',
      customer: 'Cliente'
    };
    return labels[role] || role;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
        <p className="text-muted-foreground">
          Gerencie usuários e suas permissões na plataforma
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuários da Plataforma</CardTitle>
          <CardDescription>
            Lista de todos os usuários cadastrados e seus respectivos roles
          </CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {paginatedUsers.length > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                {searchTerm 
                  ? `Mostrando ${paginatedUsers.length} de ${totalFiltered} usuários`
                  : `Mostrando ${(currentPage - 1) * ITEMS_PER_PAGE + 1}-${Math.min(currentPage * ITEMS_PER_PAGE, users?.length || 0)} de ${users?.length || 0} usuários`
                }
                {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cadastro</TableHead>
                <TableHead>Alterar Role</TableHead>
                <TableHead>Acessar Painel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? 'Nenhum usuário encontrado com esse critério de busca.' : 'Nenhum usuário cadastrado.'}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">
                      Ativo
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => updateUserRole(user.user_id, newRole)}
                      disabled={updatingUsers.includes(user.user_id)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Cliente</SelectItem>
                        <SelectItem value="reseller">Revendedor</SelectItem>
                        <SelectItem value="supplier">Fornecedor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="super_admin">Super Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <ImpersonationButton
                      userId={user.user_id}
                      userRole={user.role as UserRole}
                      userName={`${user.first_name} ${user.last_name}`.trim() || 'Usuário'}
                      disabled={updatingUsers.includes(user.user_id)}
                    />
                  </TableCell>
                </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {totalPages > 1 && (
            <div className="mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className={cn(
                        "cursor-pointer",
                        currentPage === 1 && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const showPage = 
                      page === 1 || 
                      page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1);
                    
                    const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                    const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                    if (showEllipsisBefore || showEllipsisAfter) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }

                    if (!showPage) return null;

                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className={cn(
                        "cursor-pointer",
                        currentPage === totalPages && "pointer-events-none opacity-50"
                      )}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Usuarios;