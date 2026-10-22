import React from 'react';
import { Link } from 'react-router-dom';
import lojafyLogo from '@/assets/lojafy-logo-new.png';
import { useSidebar } from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface LojafySidebarHeaderProps {
  environmentName?: string;
  dashboardUrl: string;
  badge?: React.ReactNode;
}

export const LojafySidebarHeader: React.FC<LojafySidebarHeaderProps> = ({
  environmentName = 'Lojafy',
  dashboardUrl,
}) => {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  if (isCollapsed) {
    return (
      <div className="h-16 min-h-[64px] shrink-0 border-b border-sidebar-border/80 flex items-center justify-center p-2 bg-sidebar">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to={dashboardUrl}
              className="flex items-center justify-center rounded-xl p-1.5 hover:bg-sidebar-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Lojafy"
            >
              <img
                src="/favicon.png"
                alt="Lojafy"
                className="w-7 h-7 object-contain select-none"
              />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" align="center" className="font-medium text-xs">
            Lojafy
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="h-16 min-h-[64px] shrink-0 border-b border-sidebar-border/80 flex items-center justify-center px-4 bg-sidebar transition-all duration-200">
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
  );
};
