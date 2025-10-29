import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserPlus, Edit, Power, UserCircle, AlertTriangle } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const GestaoUsuarios = () => {
  useDocumentTitle('Gestão de Usuários');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<any>(null);
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

            <Select value={roleFilter} onValueChange={setRoleFilter}>
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

            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os Planos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
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
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8">Carregando usuários...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Expiração</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.map((user) => (
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
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
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
                {!filteredUsers?.length && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
