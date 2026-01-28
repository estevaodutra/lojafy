import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserFeatureInfo } from '@/components/admin/UnifiedUsersTable';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { CreateUserDialog } from '@/components/admin/CreateUserDialog';
import { UserCleanupPanel } from '@/components/admin/UserCleanupPanel';
import { UnifiedUsersTable } from '@/components/admin/UnifiedUsersTable';
import { UserDetailsModal } from '@/components/admin/UserDetailsModal';
import { CleanupHistoryDrawer } from '@/components/admin/CleanupHistoryDrawer';
import { useToast } from '@/hooks/use-toast';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const ITEMS_PER_PAGE = 20;

interface UnifiedUser {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  subscription_plan?: string;
  subscription_expires_at?: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string;
  deleted_at?: string;
  order_count?: number;
  total_spent?: number;
  features?: UserFeatureInfo;
  origem_tipo?: 'lojafy' | 'loja' | 'importado' | 'convite';
  origem_loja_nome?: string;
}

const Clientes = () => {
  useDocumentTitle('Gestão de Usuários');
  const { toast } = useToast();

  // States
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [updatingUsers, setUpdatingUsers] = useState<string[]>([]);

  // Modal states
  const [selectedUser, setSelectedUser] = useState<UnifiedUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<UnifiedUser | null>(null);
  const [unbanningUser, setUnbanningUser] = useState<UnifiedUser | null>(null);
  const [showCleanupDrawer, setShowCleanupDrawer] = useState(false);

  // Loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnbanning, setIsUnbanning] = useState(false);

  // Fetch users with email from RPC
  const {
    data: usersFromRpc,
    isLoading: isLoadingUsers,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['users-management'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_email');
      if (error) throw error;
      return data;
    },
  });

  // Fetch order stats for all users
  const { data: orderStats } = useQuery({
    queryKey: ['users-order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('user_id, total_amount');

      if (error) throw error;

      // Aggregate order stats by user
      const statsMap: Record<string, { order_count: number; total_spent: number }> = {};
      data?.forEach((order) => {
        if (!statsMap[order.user_id]) {
          statsMap[order.user_id] = { order_count: 0, total_spent: 0 };
        }
        statsMap[order.user_id].order_count += 1;
        statsMap[order.user_id].total_spent += Number(order.total_amount) || 0;
      });

      return statsMap;
    },
  });

  // Fetch features count for all users
  const { data: userFeatures } = useQuery({
    queryKey: ['users-features-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_features')
        .select(`
          user_id,
          features:feature_id (
            nome
          )
        `)
        .in('status', ['ativo', 'trial'])
        .or('data_expiracao.is.null,data_expiracao.gt.now()');

      if (error) throw error;

      // Aggregate features by user
      const featuresMap: Record<string, UserFeatureInfo> = {};
      data?.forEach((uf: any) => {
        if (!featuresMap[uf.user_id]) {
          featuresMap[uf.user_id] = { feature_count: 0, feature_names: [] };
        }
        featuresMap[uf.user_id].feature_count += 1;
        if (uf.features?.nome) {
          featuresMap[uf.user_id].feature_names.push(uf.features.nome);
        }
      });

      return featuresMap;
    },
  });

  // Merge users with order stats and features
  const users: UnifiedUser[] = useMemo(() => {
    if (!usersFromRpc) return [];

    return usersFromRpc.map((user: any) => ({
      ...user,
      order_count: orderStats?.[user.user_id]?.order_count || 0,
      total_spent: orderStats?.[user.user_id]?.total_spent || 0,
      features: userFeatures?.[user.user_id] || { feature_count: 0, feature_names: [] },
      // Set default origin as 'lojafy' if not specified
      origem_tipo: user.origem_tipo || 'lojafy',
      origem_loja_nome: user.origem_loja_nome || null,
    }));
  }, [usersFromRpc, orderStats, userFeatures]);

  // Helper to check if user is banned
  const isUserBanned = (bannedUntil: string | null | undefined) => {
    return bannedUntil && new Date(bannedUntil) > new Date();
  };

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole = roleFilter === 'all' || user.role === roleFilter;

      const isBanned = isUserBanned(user.banned_until);
      const isDeleted = !!user.deleted_at;

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && user.is_active && !isBanned && !isDeleted) ||
        (statusFilter === 'inactive' && (!user.is_active || isBanned || isDeleted)) ||
        (statusFilter === 'banned' && isBanned);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Pagination
  const totalUsers = filteredUsers.length;
  const totalPages = Math.ceil(totalUsers / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  const handleFilterChange =
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      setCurrentPage(1);
    };

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    setUpdatingUsers((prev) => [...prev, userId]);

    try {
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      const { data: currentUser } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from('user_roles').insert({
        user_id: userId,
        role: newRole as any,
        granted_by: currentUser.user?.id,
      } as any);

      if (insertError) throw insertError;

      toast({
        title: 'Role atualizado',
        description: `Role do usuário alterado com sucesso.`,
      });
      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar role',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUpdatingUsers((prev) => prev.filter((id) => id !== userId));
    }
  };

  // Toggle user status
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
      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Delete user
  const deleteUser = async () => {
    if (!deletingUser) return;

    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: deletingUser.user_id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao excluir usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Usuário excluído',
        description: `${deletingUser.email} foi excluído com sucesso.`,
      });

      setDeletingUser(null);
      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir usuário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Unban user
  const unbanUser = async () => {
    if (!unbanningUser) return;

    setIsUnbanning(true);
    try {
      const response = await supabase.functions.invoke('unban-user', {
        body: { userId: unbanningUser.user_id },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao desbanir usuário');
      }

      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      toast({
        title: 'Usuário desbanido',
        description: `${unbanningUser.email} foi desbanido com sucesso.`,
      });

      setUnbanningUser(null);
      refetchUsers();
    } catch (error: any) {
      toast({
        title: 'Erro ao desbanir usuário',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUnbanning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie todos os usuários da plataforma
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowCleanupDrawer(true)}
          >
            <History className="h-4 w-4 mr-2" />
            Limpeza
          </Button>
          <CreateUserDialog onSuccess={refetchUsers} />
        </div>
      </div>

      {/* Cleanup Status Cards */}
      <UserCleanupPanel />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
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

            <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
                <SelectItem value="banned">Banidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="pt-6">
          <UnifiedUsersTable
            users={paginatedUsers as any}
            isLoading={isLoadingUsers}
            currentPage={currentPage}
            totalPages={totalPages}
            totalUsers={totalUsers}
            itemsPerPage={ITEMS_PER_PAGE}
            updatingUsers={updatingUsers}
            onPageChange={setCurrentPage}
            onUpdateRole={updateUserRole}
            onToggleStatus={toggleUserStatus}
            onViewDetails={(user) => setSelectedUser(user)}
            onDeleteUser={(user) => setDeletingUser(user)}
            onUnbanUser={(user) => setUnbanningUser(user)}
          />
        </CardContent>
      </Card>

      {/* User Details Modal */}
      <UserDetailsModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
      />

      {/* Cleanup History Drawer */}
      <CleanupHistoryDrawer
        isOpen={showCleanupDrawer}
        onClose={() => setShowCleanupDrawer(false)}
      />

      {/* Delete User Dialog */}
      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir o usuário{' '}
              <strong>{deletingUser?.email}</strong>?
              <br />
              <br />
              Esta ação é <strong>irreversível</strong> e irá remover
              permanentemente:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Conta do usuário</li>
                <li>Perfil e dados associados</li>
                <li>Pedidos e histórico</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir Usuário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unban User Dialog */}
      <AlertDialog
        open={!!unbanningUser}
        onOpenChange={(open) => !open && setUnbanningUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desbanir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja desbanir o usuário{' '}
              <strong>{unbanningUser?.email}</strong>?
              <br />
              <br />
              O usuário poderá acessar a plataforma normalmente após esta ação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnbanning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={unbanUser}
              disabled={isUnbanning}
            >
              {isUnbanning ? 'Desbanindo...' : 'Desbanir Usuário'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clientes;
