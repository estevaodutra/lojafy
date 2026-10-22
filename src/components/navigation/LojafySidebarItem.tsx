import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export interface LojafySidebarItemProps {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  aliases?: string[];
  exactMatch?: boolean;
  onClick?: () => void;
  className?: string;
}

export const LojafySidebarItem: React.FC<LojafySidebarItemProps> = ({
  title,
  url,
  icon: Icon,
  badge,
  badgeVariant = 'secondary',
  aliases = [],
  exactMatch = false,
  onClick,
  className,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;
  const currentPath = location.pathname;

  // Active calculation
  const isActive = React.useMemo(() => {
    if (currentPath === url) return true;
    if (aliases.some(alias => currentPath === alias || currentPath.startsWith(alias + '/'))) {
      return true;
    }
    if (!exactMatch && url !== '/' && url !== '/super-admin' && url !== '/supplier' && url !== '/admin' && url !== '/reseller' && url !== '/reseller/dashboard' && url !== '/minha-conta') {
      return currentPath.startsWith(url + '/');
    }
    return false;
  }, [currentPath, url, aliases, exactMatch]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else {
      navigate(url);
    }
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const buttonContent = (
    <button
      onClick={handleClick}
      data-active={isActive}
      className={cn(
        'group relative flex w-full items-center gap-3 rounded-[8px] text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
        isCollapsed ? 'h-10 w-10 justify-center p-0 mx-auto' : 'h-10 px-3 py-2 text-left',
        isActive
          ? 'bg-blue-50/90 text-[#1E2D8F] dark:bg-blue-950/50 dark:text-blue-300 font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-[#1E2D8F] dark:before:bg-blue-400'
          : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white',
        className
      )}
      aria-label={title}
    >
      <Icon
        className={cn(
          'h-[18px] w-[18px] shrink-0 transition-colors',
          isActive
            ? 'text-[#1E2D8F] dark:text-blue-400'
            : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'
        )}
      />

      {!isCollapsed && (
        <>
          <span className="truncate flex-1 tracking-tight">{title}</span>
          {badge !== undefined && badge !== null && (
            <Badge
              variant={badgeVariant}
              className={cn(
                'ml-auto text-[11px] px-1.5 py-0 font-medium shrink-0',
                isActive && 'bg-blue-200/60 text-[#1E2D8F] dark:bg-blue-900/60 dark:text-blue-200'
              )}
            >
              {badge}
            </Badge>
          )}
        </>
      )}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex justify-center w-full my-0.5">{buttonContent}</div>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" className="flex items-center gap-2 text-xs font-medium">
          <span>{title}</span>
          {badge !== undefined && badge !== null && (
            <Badge variant={badgeVariant} className="text-[10px] px-1 py-0">
              {badge}
            </Badge>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div className="my-0.5">{buttonContent}</div>;
};
