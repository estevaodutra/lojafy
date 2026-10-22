import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Store, User, MoreVertical, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LojafySidebarItem, LojafySidebarItemProps } from './LojafySidebarItem';

export interface LojafyFooterActionItem extends Omit<LojafySidebarItemProps, 'exactMatch'> {
  id?: string;
}

export interface LojafySidebarFooterProps {
  actionItems?: LojafyFooterActionItem[];
  customStoreUrl?: string;
  storeLabel?: string;
  showProfileMenu?: boolean;
  onLogout?: () => Promise<void> | void;
}

export const LojafySidebarFooter: React.FC<LojafySidebarFooterProps> = ({
  actionItems = [],
  customStoreUrl = '/?view=store',
  storeLabel = 'Ver Loja',
  showProfileMenu = true,
  onLogout,
}) => {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  const handleSignOut = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await signOut();
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const displayEmail = user?.email || '';
  const displayRole = profile?.role
    ? profile.role === 'super_admin'
      ? 'Super Admin'
      : profile.role === 'reseller'
      ? 'Revendedor'
      : profile.role === 'supplier'
      ? 'Fornecedor'
      : profile.role === 'admin'
      ? 'Administrador'
      : 'Cliente'
    : '';

  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <div className="mt-auto shrink-0 border-t border-sidebar-border/80 bg-sidebar p-2 flex flex-col gap-1 transition-all duration-200">
      {/* Footer Nav Actions (e.g. Super Admin: Notificações, Ajuda, Configurações) */}
      {actionItems.length > 0 && (
        <div className="flex flex-col space-y-0.5 pb-1">
          {actionItems.map((item) => (
            <LojafySidebarItem key={item.title} {...item} />
          ))}
        </div>
      )}

      {showProfileMenu && (
        <>
          {actionItems.length > 0 && (
            <div className="h-px bg-sidebar-border/60 mx-1 my-1" />
          )}

          <DropdownMenu>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="flex h-10 w-10 mx-auto items-center justify-center rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                      aria-label="Perfil do usuário"
                    >
                      <Avatar className="h-8 w-8 rounded-full border border-sidebar-border">
                        <AvatarImage src={profile?.avatar_url || ''} alt={displayName} />
                        <AvatarFallback className="text-xs font-semibold bg-blue-100 text-[#1E2D8F] dark:bg-blue-900 dark:text-blue-200">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" className="text-xs">
                  {displayName}
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenuTrigger asChild>
                <button
                  className="group flex w-full items-center gap-3 p-2 rounded-[8px] hover:bg-slate-100/80 dark:hover:bg-slate-800/60 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  aria-label="Opções da conta"
                >
                  <Avatar className="h-8 w-8 rounded-full border border-sidebar-border shrink-0">
                    <AvatarImage src={profile?.avatar_url || ''} alt={displayName} />
                    <AvatarFallback className="text-xs font-semibold bg-blue-100 text-[#1E2D8F] dark:bg-blue-900 dark:text-blue-200">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight">
                      {displayName}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground leading-tight">
                      {displayRole || displayEmail}
                    </span>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
                </button>
              </DropdownMenuTrigger>
            )}

            <DropdownMenuContent
              side={isCollapsed ? 'right' : 'top'}
              align={isCollapsed ? 'end' : 'center'}
              sideOffset={8}
              className="w-56 p-1 z-50 shadow-md"
            >
              <DropdownMenuLabel className="px-2 py-1.5">
                <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                {displayEmail && (
                  <p className="text-[11px] font-normal text-muted-foreground truncate">{displayEmail}</p>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => {
                  navigate('/minha-conta');
                  if (isMobile) setOpenMobile(false);
                }}
                className="cursor-pointer text-xs flex items-center gap-2"
              >
                <User className="h-3.5 w-3.5" />
                <span>Minha Conta</span>
              </DropdownMenuItem>

              {customStoreUrl && (
                <DropdownMenuItem
                  onClick={() => {
                    navigate(customStoreUrl);
                    if (isMobile) setOpenMobile(false);
                  }}
                  className="cursor-pointer text-xs flex items-center gap-2"
                >
                  <Store className="h-3.5 w-3.5" />
                  <span>{storeLabel}</span>
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-xs flex items-center gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </div>
  );
};
