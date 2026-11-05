import React from 'react';
import { Link } from 'react-router-dom';
import { PanelLeft } from 'lucide-react';
import lojafyLogo from '@/assets/lojafy-logo-new.png';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LojafySidebarHeaderProps {
  environmentName?: string;
  dashboardUrl: string;
  badge?: React.ReactNode;
}

export const LojafySidebarHeader: React.FC<LojafySidebarHeaderProps> = ({
  dashboardUrl,
}) => {
  const { state, isMobile, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  if (isCollapsed) {
    return (
      <div className="h-[74px] min-h-[74px] shrink-0 border-b border-sidebar-border/80 flex flex-col items-center justify-center gap-1.5 p-2 bg-sidebar">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={dashboardUrl}
              className="flex items-center justify-center rounded-lg p-1 hover:bg-sidebar-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Lojafy — Ir para o início"
            >
              <img
                src="/favicon.png"
                alt="Lojafy"
                className="w-6 h-6 object-contain select-none"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="font-medium text-xs">
            Lojafy — Início
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSidebar}
              className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Expandir menu"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="font-medium text-xs">
            Expandir menu
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="h-16 min-h-[64px] shrink-0 border-b border-sidebar-border/80 flex items-center justify-between px-3 bg-sidebar relative transition-all duration-200">
      <div className="flex-1 flex items-center justify-center">
        <Link
          to={dashboardUrl}
          className="flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-lg px-2 py-1"
          aria-label="Lojafy"
        >
          {/* Frame container with clean, centered logo */}
          <div className="relative flex items-center justify-center h-8 w-[112px] overflow-hidden">
            <img
              src={lojafyLogo}
              alt="Lojafy"
              className="w-[120px] h-[120px] max-w-none shrink-0 object-contain select-none transition-transform duration-200 group-hover:scale-105"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </Link>
      </div>

      {/* Botão de recolher embutido no header da sidebar */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleSidebar}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            aria-label="Recolher menu"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" className="font-medium text-xs">
          Recolher menu
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
