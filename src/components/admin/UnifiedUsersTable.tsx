import { useState } from 'react';
import {
  Power,
  Trash2,
  ShieldOff,
  Sparkles,
  MoreHorizontal,
  Eye,
  Store,
  Link,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImpersonationButton } from '@/components/admin/ImpersonationButton';
import { GenerateAccessLinkModal } from '@/components/admin/GenerateAccessLinkModal';
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

export interface UserFeatureInfo {
  feature_count: number;
  feature_names: string[];
}

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
  features?: UserFeatureInfo;
  origem_tipo?: 'lojafy' | 'loja' | 'importado' | 'convite';
  origem_loja_nome?: string;
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
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onViewDetails: (user: UnifiedUser) => void;
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
  onToggleStatus,
  onViewDetails,
  onDeleteUser,
  onUnbanUser,
}: UnifiedUsersTableProps) => {
  const [accessLinkModal, setAccessLinkModal] = useState<{ userId: string; userName: string } | null>(null);
  
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

  // Unified status with colors
  const getUnifiedStatus = (user: UnifiedUser) => {
    if (user.deleted_at) {
      return { label: 'Excluído', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    }
    if (isUserBanned(user.banned_until)) {
      return { label: 'Banido', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' };
    }
    if (!user.is_active) {
      return { label: 'Inativo', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400' };
    }
    if (!user.last_sign_in_at) {
      return { label: 'Aguardando', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' };
    }
    return { label: 'Ativo', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' };
  };

  // Origin badge
  const getOrigemBadge = (user: UnifiedUser) => {
    const tipo = user.origem_tipo || 'lojafy';
    
    switch (tipo) {
      case 'loja':
        return {
          label: user.origem_loja_nome || 'Loja',
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
          icon: <Store className="h-3 w-3 mr-1" />,
        };
      case 'importado':
        return {
          label: 'Importado',
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
          icon: null,
        };
      case 'convite':
        return {
          label: 'Convite',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
          icon: null,
        };
      default:
        return {
          label: 'Lojafy',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
          icon: null,
        };
    }
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
              <TableHead className="whitespace-nowrap min-w-[80px]">Features</TableHead>
              <TableHead className="whitespace-nowrap min-w-[70px]">Pedidos</TableHead>
              <TableHead className="whitespace-nowrap min-w-[90px]">Total Gasto</TableHead>
              <TableHead className="whitespace-nowrap min-w-[90px]">Status</TableHead>
              <TableHead className="whitespace-nowrap min-w-[100px]">Origem</TableHead>
              <TableHead className="text-right whitespace-nowrap min-w-[80px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const status = getUnifiedStatus(user);
              const origem = getOrigemBadge(user);
              const isBanned = isUserBanned(user.banned_until);

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
                    {user.features && user.features.feature_count > 0 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant="secondary" className="cursor-help flex items-center gap-1 w-fit">
                              <Sparkles className="h-3 w-3" />
                              {user.features.feature_count}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-sm">
                              <p className="font-medium mb-1">Features ativas:</p>
                              <ul className="list-disc list-inside">
                                {user.features.feature_names.map((name, i) => (
                                  <li key={i}>{name}</li>
                                ))}
                              </ul>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
                    <Badge className={`${status.className} border-0`}>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${origem.className} border-0 flex items-center w-fit`}>
                      {origem.icon}
                      {origem.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => onViewDetails(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver detalhes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onToggleStatus(user.user_id, user.is_active)}>
                          <Power className="mr-2 h-4 w-4" />
                          {user.is_active ? 'Desativar' : 'Ativar'}
                        </DropdownMenuItem>
                        <ImpersonationButton
                          userId={user.user_id}
                          userRole={user.role}
                          userName={`${user.first_name} ${user.last_name}`}
                          asMenuItem
                        />
                        {user.role === 'reseller' && (
                          <DropdownMenuItem
                            onClick={() => setAccessLinkModal({
                              userId: user.user_id,
                              userName: `${user.first_name} ${user.last_name}`,
                            })}
                          >
                            <Link className="mr-2 h-4 w-4" />
                            Gerar Link de Acesso
                          </DropdownMenuItem>
                        )}
                        {isBanned && (
                          <DropdownMenuItem onClick={() => onUnbanUser(user)}>
                            <ShieldOff className="mr-2 h-4 w-4" />
                            Desbanir
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDeleteUser(user)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {!users.length && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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

      {/* Access Link Modal */}
      {accessLinkModal && (
        <GenerateAccessLinkModal
          open={!!accessLinkModal}
          onOpenChange={(open) => !open && setAccessLinkModal(null)}
          userId={accessLinkModal.userId}
          userName={accessLinkModal.userName}
        />
      )}
    </div>
  );
};
