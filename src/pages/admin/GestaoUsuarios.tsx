import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, Edit, Power, UserCircle, AlertTriangle, Clock, UserX, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays } from 'date-fns';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { ImpersonationButton } from '@/components/admin/ImpersonationButton';
import { EditSubscriptionDialog } from '@/components/admin/EditSubscriptionDialog';
import { UserCleanupPanel } from '@/components/admin/UserCleanupPanel';
import { CleanupHistoryTab } from '@/components/admin/CleanupHistoryTab';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const ITEMS_PER_PAGE = 20;

const GestaoUsuarios = () => {
  useDocumentTitle('Gestão de Usuários');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingUsers, setUpdatingUsers] = useState<string[]>([]);
  const { toast } = useToast();

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['users-management'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_email');
      if (error) throw error;
      return data;
    },
  });

  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesPlan = planFilter === 'all' || user.subscription_plan === planFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);

    return matchesSearch && matchesRole && matchesPlan && matchesStatus;
  });

  // Pagination calculations
  const totalUsers = filteredUsers?.length || 0;
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedUsers = filteredUsers?.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUsers(prev => [...prev, userId]);
    
    try {
      // Usar tabela user_roles (segura) em vez de profiles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      const { data: currentUser } = await supabase.auth.getUser();
      
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ 
          user_id: userId, 
          role: newRole as any,
          granted_by: currentUser.user?.id
        } as any);

      if (insertError) throw insertError;

      toast({
        title: 'Role atualizado',
        description: `Role do usuário alterado para ${getRoleLabel(newRole)} com sucesso.`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingUsers(prev => prev.filter(id => id !== userId));
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !currentStatus })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: `Usuário ${!currentStatus ? 'ativado' : 'desativado'} com sucesso.`,
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin': return 'destructive';
      case 'admin': return 'default';
      case 'reseller': return 'secondary';
      case 'supplier': return 'outline';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      super_admin: 'Super Admin',
      admin: 'Administrador',
      reseller: 'Revendedor',
      supplier: 'Fornecedor',
      customer: 'Cliente',
    };
    return labels[role] || role;
  };

  const getExpirationStatus = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const daysUntilExpiration = differenceInDays(new Date(expiresAt), new Date());
    
    if (daysUntilExpiration < 0) {
      return { type: 'expired', label: 'Expirado', variant: 'destructive' as const };
    } else if (daysUntilExpiration <= 7) {
      return { type: 'warning', label: `Expira em ${daysUntilExpiration}d`, variant: 'secondary' as const };
    }
    return null;
  };

  const getActivityStatus = (createdAt: string, lastSignInAt: string | null, isActive: boolean) => {
    if (lastSignInAt) {
      return { icon: <Clock className="h-3 w-3" />, text: "Ativo", variant: "default" as const };
    }

    const created = new Date(createdAt);
    const daysSinceCreation = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceCreation >= 60) {
      return { icon: <Trash2 className="h-3 w-3" />, text: "Será excluído", variant: "destructive" as const };
    }
    if (daysSinceCreation >= 50) {
      return { icon: <Trash2 className="h-3 w-3" />, text: `Exclusão em ${60 - daysSinceCreation}d`, variant: "destructive" as const };
    }
    if (daysSinceCreation >= 30) {
      if (!isActive) {
        return { icon: <UserX className="h-3 w-3" />, text: "Desativado", variant: "secondary" as const };
      }
      return { icon: <UserX className="h-3 w-3" />, text: `Desativado há ${daysSinceCreation - 30}d`, variant: "secondary" as const };
    }
    if (daysSinceCreation >= 20) {
      return { icon: <Clock className="h-3 w-3" />, text: `${30 - daysSinceCreation}d p/ desativar`, variant: "outline" as const };
    }
    return { icon: <Clock className="h-3 w-3" />, text: "Aguardando acesso", variant: "outline" as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie todos os usuários da plataforma
          </p>
        </div>
        <CreateUserDialog onSuccess={refetch} />
      </div>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="cleanup">Histórico de Limpeza</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6 mt-0">
          {/* User Cleanup Status Cards */}
          <UserCleanupPanel />

          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={roleFilter} onValueChange={handleFilterChange(setRoleFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Roles</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="reseller">Revendedores</SelectItem>
                    <SelectItem value="supplier">Fornecedores</SelectItem>
                    <SelectItem value="customer">Clientes</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={planFilter} onValueChange={handleFilterChange(setPlanFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Planos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Planos</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="inactive">Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 overflow-x-auto">
              {isLoading ? (
                <div className="text-center py-8">Carregando usuários...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Nome</TableHead>
                      <TableHead className="whitespace-nowrap">Email</TableHead>
                      <TableHead className="whitespace-nowrap">Role</TableHead>
                      <TableHead className="whitespace-nowrap">Alterar Role</TableHead>
                      <TableHead className="whitespace-nowrap">Plano</TableHead>
                      <TableHead className="whitespace-nowrap">Expiração</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Atividade</TableHead>
                      <TableHead className="whitespace-nowrap">Criação</TableHead>
                      <TableHead className="whitespace-nowrap">Último Acesso</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers?.map((user) => (
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
                        <TableCell className="whitespace-nowrap">
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
                        <TableCell className="whitespace-nowrap">
                          {user.role === 'reseller' && user.subscription_plan ? (
                            <PremiumBadge plan={user.subscription_plan as 'free' | 'premium'} />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.role === 'reseller' && user.subscription_expires_at ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(user.subscription_expires_at), 'dd/MM/yyyy')}
                              </span>
                              {getExpirationStatus(user.subscription_expires_at) && (
                                <Badge 
                                  variant={getExpirationStatus(user.subscription_expires_at)!.variant}
                                  className="text-xs"
                                >
                                  {getExpirationStatus(user.subscription_expires_at)!.type === 'expired' && (
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                  )}
                                  {getExpirationStatus(user.subscription_expires_at)!.label}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? 'success' : 'destructive'}>
                            {user.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={getActivityStatus(user.created_at, user.last_sign_in_at, user.is_active).variant}
                            className="flex items-center gap-1 w-fit text-xs"
                          >
                            {getActivityStatus(user.created_at, user.last_sign_in_at, user.is_active).icon}
                            {getActivityStatus(user.created_at, user.last_sign_in_at, user.is_active).text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          {user.last_sign_in_at ? (
                            <span className="text-sm">
                              {format(new Date(user.last_sign_in_at), 'dd/MM/yyyy HH:mm')}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Nunca acessou</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {user.role === 'reseller' && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setEditingUser(user)}
                                title="Editar plano"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => toggleUserStatus(user.user_id, user.is_active)}
                              title={user.is_active ? 'Desativar' : 'Ativar'}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <ImpersonationButton 
                              userId={user.user_id}
                              userRole={user.role}
                              userName={`${user.first_name} ${user.last_name}`}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!paginatedUsers?.length && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {startIndex + 1}-{Math.min(endIndex, totalUsers)} de {totalUsers} usuários
                  </div>
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => setCurrentPage(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cleanup" className="mt-0">
          <CleanupHistoryTab />
        </TabsContent>
      </Tabs>

      <EditSubscriptionDialog
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser || {}}
        onSuccess={refetch}
      />
    </div>
  );
};

export default GestaoUsuarios;
