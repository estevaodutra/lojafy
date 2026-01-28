import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { UserCheck, AlertTriangle } from 'lucide-react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { UserRole } from '@/hooks/useUserRole';

interface ImpersonationButtonProps {
  userId: string;
  userRole: UserRole;
  userName: string;
  disabled?: boolean;
  asMenuItem?: boolean;
}

export const ImpersonationButton: React.FC<ImpersonationButtonProps> = ({
  userId,
  userRole,
  userName,
  disabled = false,
  asMenuItem = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { impersonateUser } = useImpersonation();

  const handleImpersonate = async () => {
    setIsLoading(true);
    try {
      await impersonateUser(userId, userRole, userName);
      setIsOpen(false);
    } catch (error) {
      console.error('Error during impersonation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show button for super_admin users
  if (userRole === 'super_admin') {
    return null;
  }

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'supplier':
        return 'Fornecedor';
      case 'reseller':
        return 'Revendedor';
      case 'customer':
        return 'Cliente';
      default:
        return 'Usuário';
    }
  };

  const TriggerComponent = asMenuItem ? (
    <DropdownMenuItem
      disabled={disabled}
      onSelect={(e) => {
        e.preventDefault();
        setIsOpen(true);
      }}
    >
      <UserCheck className="mr-2 h-4 w-4" />
      Impersonar
    </DropdownMenuItem>
  ) : (
    <Button
      variant="outline"
      size="sm"
      disabled={disabled}
      className="h-8 w-8 p-0"
      title={`Acessar painel como ${userName}`}
    >
      <UserCheck className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!asMenuItem && (
        <DialogTrigger asChild>
          {TriggerComponent}
        </DialogTrigger>
      )}
      {asMenuItem && TriggerComponent}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Confirmar Impersonação
          </DialogTitle>
          <DialogDescription>
            Você está prestes a acessar o painel como outro usuário.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-yellow-800">
              Atenção: Modo de Impersonação
            </p>
            <p className="text-sm text-yellow-700">
              Você será redirecionado para o painel de <strong>{userName}</strong> ({getRoleLabel(userRole)}).
              Todas as ações serão registradas para auditoria.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImpersonate}
            disabled={isLoading}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            {isLoading ? 'Acessando...' : 'Confirmar Acesso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
