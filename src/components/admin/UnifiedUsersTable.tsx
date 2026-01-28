import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Edit,
  Power,
  Trash2,
  ShieldOff,
  Clock,
  UserX,
  AlertTriangle,
  Eye,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { ImpersonationButton } from '@/components/admin/ImpersonationButton';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { UserRole } from '@/hooks/useUserRole';

interface UnifiedUser {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  subscription_plan?: string;
  subscription_expires_at?: string;
  is_active: boolean;
  created_at: string;
  last_sign_in_at?: string;
  banned_until?: string;
  deleted_at?: string;
  order_count?: number;
  total_spent?: number;
}

interface UnifiedUsersTableProps {
  users: UnifiedUser[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  itemsPerPage: number;
  updatingUsers: string[];
  onPageChange: (page: number) => void;
  onUpdateRole: (userId: string, newRole: string) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onViewDetails: (user: UnifiedUser) => void;
  onEditPlan: (user: UnifiedUser) => void;
  onDeleteUser: (user: UnifiedUser) => void;
  onUnbanUser: (user: UnifiedUser) => void;
}

export const UnifiedUsersTable = ({
  users,
  isLoading,
  currentPage,
  totalPages,
  totalUsers,
  itemsPerPage,
  updatingUsers,
  onPageChange,
  onUpdateRole,
  onToggleStatus,
  onViewDetails,
  onEditPlan,
  onDeleteUser,
  onUnbanUser,
}: UnifiedUsersTableProps) => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;

  const isUserBanned = (bannedUntil: string | null | undefined) => {
    return bannedUntil && new Date(bannedUntil) > new Date();
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      case 'reseller':
        return 'secondary';
      case 'supplier':
        return 'outline';
      default:
        return 'outline';
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
      return {
        type: 'warning',
        label: `Expira em ${daysUntilExpiration}d`,
        variant: 'secondary' as const,
      };
    }
    return null;
  };

  const getActivityStatus = (
    createdAt: string,
    lastSignInAt: string | null | undefined,
    isActive: boolean,
    bannedUntil: string | null | undefined,
    deletedAt: string | null | undefined
  ) => {
    if (deletedAt) {
      return {
        icon: <Trash2 className="h-3 w-3" />,
        text: 'Excluído',
        variant: 'destructive' as const,
      };
    }

    if (bannedUntil && new Date(bannedUntil) > new Date()) {
      return {
        icon: <UserX className="h-3 w-3" />,
        text: 'Banido',
        variant: 'destructive' as const,
      };
    }

    if (lastSignInAt) {
      return { icon: <Clock className="h-3 w-3" />, text: 'Ativo', variant: 'default' as const };
    }

    const created = new Date(createdAt);
    const daysSinceCreation = Math.floor(
      (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreation >= 60) {
      return {
        icon: <Trash2 className="h-3 w-3" />,
        text: 'Será excluído',
        variant: 'destructive' as const,
      };
    }
    if (daysSinceCreation >= 50) {
      return {
        icon: <Trash2 className="h-3 w-3" />,
        text: `Exclusão em ${60 - daysSinceCreation}d`,
        variant: 'destructive' as const,
      };
    }
    if (daysSinceCreation >= 30) {
      if (!isActive) {
        return {
          icon: <UserX className="h-3 w-3" />,
          text: 'Desativado',
          variant: 'secondary' as const,
        };
      }
      return {
        icon: <UserX className="h-3 w-3" />,
        text: `Desativado há ${daysSinceCreation - 30}d`,
        variant: 'secondary' as const,
      };
    }
    if (daysSinceCreation >= 20) {
      return {
        icon: <Clock className="h-3 w-3" />,
        text: `${30 - daysSinceCreation}d p/ desativar`,
        variant: 'outline' as const,
      };
    }
    return {
      icon: <Clock className="h-3 w-3" />,
      text: 'Aguardando acesso',
      variant: 'outline' as const,
    };
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap min-w-[150px]">Nome</TableHead>
              <TableHead className="whitespace-nowrap min-w-[180px]">Email</TableHead>
              <TableHead className="whitespace-nowrap min-w-[100px]">Telefone</TableHead>
              <TableHead className="whitespace-nowrap min-w-[100px]">Role</TableHead>
              <TableHead className="whitespace-nowrap min-w-[120px]">Alterar Role</TableHead>
              <TableHead className="whitespace-nowrap min-w-[80px]">Plano</TableHead>
              <TableHead className="whitespace-nowrap min-w-[70px]">Pedidos</TableHead>
              <TableHead className="whitespace-nowrap min-w-[90px]">Total Gasto</TableHead>
              <TableHead className="whitespace-nowrap min-w-[80px]">Status</TableHead>
              <TableHead className="whitespace-nowrap min-w-[120px]">Atividade</TableHead>
              <TableHead className="whitespace-nowrap min-w-[100px]">Criação</TableHead>
              <TableHead className="text-right whitespace-nowrap min-w-[150px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const activityStatus = getActivityStatus(
                user.created_at,
                user.last_sign_in_at,
                user.is_active,
                user.banned_until,
                user.deleted_at
              );
              const isBanned = isUserBanned(user.banned_until);
              const isDeleted = !!user.deleted_at;

              return (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell className="text-sm">
                    {user.phone || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(newRole) => onUpdateRole(user.user_id, newRole)}
                      disabled={updatingUsers.includes(user.user_id)}
                    >
                      <SelectTrigger className="w-28 h-8 text-xs">
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
                    {user.role === 'reseller' && user.subscription_plan ? (
                      <div className="flex flex-col gap-1">
                        <PremiumBadge plan={user.subscription_plan as 'free' | 'premium'} />
                        {getExpirationStatus(user.subscription_expires_at) && (
                          <Badge
                            variant={getExpirationStatus(user.subscription_expires_at)!.variant}
                            className="text-xs"
                          >
                            {getExpirationStatus(user.subscription_expires_at)!.type ===
                              'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                            {getExpirationStatus(user.subscription_expires_at)!.label}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{user.order_count || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatCurrency(user.total_spent || 0)}
                  </TableCell>
                  <TableCell>
                    {isDeleted ? (
                      <Badge variant="destructive">Excluído</Badge>
                    ) : isBanned ? (
                      <Badge variant="destructive">Banido</Badge>
                    ) : (
                      <Badge variant={user.is_active ? 'default' : 'secondary'}>
                        {user.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={activityStatus.variant}
                      className="flex items-center gap-1 w-fit text-xs"
                    >
                      {activityStatus.icon}
                      {activityStatus.text}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onViewDetails(user)}
                        title="Ver detalhes"
                        className="h-8 w-8"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {user.role === 'reseller' && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEditPlan(user)}
                          title="Editar plano"
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onToggleStatus(user.user_id, user.is_active)}
                        title={user.is_active ? 'Desativar' : 'Ativar'}
                        className="h-8 w-8"
                      >
                        <Power className="h-4 w-4" />
                      </Button>
                      <ImpersonationButton
                        userId={user.user_id}
                        userRole={user.role}
                        userName={`${user.first_name} ${user.last_name}`}
                      />
                      {isBanned && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onUnbanUser(user)}
                          title="Desbanir usuário"
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <ShieldOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDeleteUser(user)}
                        title="Excluir usuário"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {!users.length && (
              <TableRow>
                <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Mostrando {startIndex + 1}-{Math.min(endIndex, totalUsers)} de {totalUsers} usuários
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {(() => {
                const maxVisible = 5;
                let pages: (number | 'ellipsis-start' | 'ellipsis-end')[] = [];

                if (totalPages <= maxVisible) {
                  pages = Array.from({ length: totalPages }, (_, i) => i + 1);
                } else if (currentPage <= 3) {
                  pages = [1, 2, 3, 4, 5, 'ellipsis-end'];
                } else if (currentPage >= totalPages - 2) {
                  pages = [
                    'ellipsis-start',
                    totalPages - 4,
                    totalPages - 3,
                    totalPages - 2,
                    totalPages - 1,
                    totalPages,
                  ];
                } else {
                  pages = ['ellipsis-start', currentPage - 1, currentPage, currentPage + 1, 'ellipsis-end'];
                }

                return pages.map((page, index) => (
                  <PaginationItem key={index}>
                    {page === 'ellipsis-start' || page === 'ellipsis-end' ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink
                        onClick={() => onPageChange(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ));
              })()}
              <PaginationItem>
                <PaginationNext
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
};
