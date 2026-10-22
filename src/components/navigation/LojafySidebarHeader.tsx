import React from 'react';
import { Link } from 'react-router-dom';
import lojafyLogo from '@/assets/lojafy-logo-new.png';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LojafySidebarHeaderProps {
  environmentName: string;
  dashboardUrl: string;
  badge?: React.ReactNode;
}

export const LojafySidebarHeader: React.FC<LojafySidebarHeaderProps> = ({
  environmentName,
  dashboardUrl,
  badge,
}) => {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  if (isCollapsed) {
    return (
      <div className="h-[88px] min-h-[88px] shrink-0 border-b border-sidebar-border/80 flex items-center justify-center p-2 bg-sidebar">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={dashboardUrl}
              className="flex items-center justify-center rounded-xl p-1.5 hover:bg-sidebar-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label={`Lojafy — ${environmentName}`}
            >
              <img
                src="/favicon.png"
                alt="Lojafy"
                className="w-9 h-9 object-contain select-none"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="font-medium text-xs">
            Lojafy — {environmentName}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="h-[92px] min-h-[92px] shrink-0 border-b border-sidebar-border/80 flex flex-col items-center justify-center px-4 py-3 bg-sidebar transition-all duration-200">
      <Link
        to={dashboardUrl}
        className="flex flex-col items-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring rounded-lg px-2 py-1"
        aria-label={`Lojafy — ${environmentName}`}
      >
        {/* Frame container adjusted to eliminate the 1080x1080 transparent padding */}
        <div className="relative flex items-center justify-center h-10 w-[172px] overflow-hidden">
          <img
            src={lojafyLogo}
            alt="Lojafy"
            className="absolute w-[172px] h-[172px] max-w-none object-contain select-none transition-transform duration-200 group-hover:scale-[1.02]"
            style={{ pointerEvents: 'none' }}
          />
        </div>

        {/* Discreet environment badge / label */}
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/80 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
            {environmentName}
          </span>
          {badge}
        </div>
      </Link>
    </div>
  );
};
