import React, { useState, useEffect, useId, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface LojafySubItem {
  title: string;
  url: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  aliases?: string[];
}

export interface LojafySidebarCollapseProps {
  id?: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: LojafySubItem[];
  defaultOpen?: boolean;
}

export const LojafySidebarCollapse: React.FC<LojafySidebarCollapseProps> = ({
  title,
  icon: Icon,
  items,
  defaultOpen = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;
  const currentPath = location.pathname;
  const contentId = useId();

  // Check if any child item matches the current route
  const isAnyChildActive = React.useMemo(() => {
    return items.some((item) => {
      if (currentPath === item.url) return true;
      if (currentPath.startsWith(item.url + '/')) return true;
      if (item.aliases?.some((alias) => currentPath === alias || currentPath.startsWith(alias + '/'))) {
        return true;
      }
      return false;
    });
  }, [currentPath, items]);

  const [isOpen, setIsOpen] = useState(defaultOpen || isAnyChildActive);
  const prevPathRef = useRef(currentPath);

  // Only auto-open on actual page navigation, never overriding manual toggle while on the same page
  useEffect(() => {
    if (prevPathRef.current !== currentPath) {
      prevPathRef.current = currentPath;
      if (isAnyChildActive) {
        setIsOpen(true);
      }
    }
  }, [currentPath, isAnyChildActive]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSubItemClick = (url: string) => {
    navigate(url);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Render dropdown when sidebar is collapsed
  if (isCollapsed) {
    return (
      <div className="flex justify-center w-full my-0.5">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button
                  data-active={isAnyChildActive}
                  className={cn(
                    'group relative flex h-10 w-10 items-center justify-center rounded-[8px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                    isAnyChildActive
                      ? 'bg-blue-50/90 text-[#1E2D8F] dark:bg-blue-950/50 dark:text-blue-300 font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:rounded-r-full before:bg-[#1E2D8F] dark:before:bg-blue-400'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  )}
                  aria-label={title}
                >
                  <Icon
                    className={cn(
                      'h-[18px] w-[18px] shrink-0',
                      isAnyChildActive
                        ? 'text-[#1E2D8F] dark:text-blue-400'
                        : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'
                    )}
                  />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              {title}
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent side="right" align="start" sideOffset={12} className="w-56 p-1">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
              {title}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {items.map((sub) => {
              const isSubActive =
                currentPath === sub.url ||
                currentPath.startsWith(sub.url + '/') ||
                (sub.aliases?.some((a) => currentPath === a || currentPath.startsWith(a + '/')) ?? false);
              const SubIcon = sub.icon;

              return (
                <DropdownMenuItem
                  key={sub.url}
                  onClick={() => handleSubItemClick(sub.url)}
                  className={cn(
                    'flex items-center gap-2 px-2.5 py-2 text-sm cursor-pointer rounded-md',
                    isSubActive
                      ? 'bg-blue-50/90 text-[#1E2D8F] font-semibold dark:bg-blue-950/50 dark:text-blue-300'
                      : 'text-slate-700 dark:text-slate-200'
                  )}
                >
                  {SubIcon && <SubIcon className="h-4 w-4 shrink-0" />}
                  <span className="truncate flex-1">{sub.title}</span>
                  {sub.badge && (
                    <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">
                      {sub.badge}
                    </span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // Expanded collapsible item
  return (
    <div className="my-0.5 w-full">
      <button
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={cn(
          'group relative flex w-full items-center gap-3 h-10 px-3 py-2 rounded-[8px] text-sm font-medium transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring text-left',
          isAnyChildActive
            ? 'bg-blue-50/50 text-[#1E2D8F] dark:bg-blue-950/30 dark:text-blue-300 font-semibold'
            : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
        )}
      >
        <Icon
          className={cn(
            'h-[18px] w-[18px] shrink-0 transition-colors',
            isAnyChildActive
              ? 'text-[#1E2D8F] dark:text-blue-400'
              : 'text-slate-500 group-hover:text-slate-900 dark:text-slate-400 dark:group-hover:text-white'
          )}
        />
        <span className="truncate flex-1 tracking-tight">{title}</span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 transition-transform duration-150" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 transition-transform duration-150" />
        )}
      </button>

      {isOpen && (
        <div
          id={contentId}
          className="relative ml-4 pl-3 border-l border-slate-200 dark:border-slate-800/80 mt-1 mb-1 space-y-1"
        >
          {items.map((sub) => {
            const isSubActive =
              currentPath === sub.url ||
              currentPath.startsWith(sub.url + '/') ||
              (sub.aliases?.some((a) => currentPath === a || currentPath.startsWith(a + '/')) ?? false);
            const SubIcon = sub.icon;

            return (
              <button
                key={sub.url}
                onClick={() => handleSubItemClick(sub.url)}
                className={cn(
                  'group relative flex w-full items-center gap-2.5 h-8 px-2.5 rounded-[6px] text-xs font-medium transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                  isSubActive
                    ? 'bg-blue-50/90 text-[#1E2D8F] dark:bg-blue-950/50 dark:text-blue-300 font-semibold'
                    : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
                )}
              >
                {SubIcon ? (
                  <SubIcon
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      isSubActive ? 'text-[#1E2D8F] dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                    )}
                  />
                ) : (
                  <span
                    className={cn(
                      'h-1.5 w-1.5 rounded-full shrink-0',
                      isSubActive ? 'bg-[#1E2D8F] dark:bg-blue-400' : 'bg-slate-300 dark:bg-slate-600'
                    )}
                  />
                )}
                <span className="truncate flex-1">{sub.title}</span>
                {sub.badge && (
                  <span className="ml-auto text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full">
                    {sub.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
