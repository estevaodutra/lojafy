import React from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

interface LojafySidebarGroupProps {
  label?: string;
  children: React.ReactNode;
  className?: string;
}

export const LojafySidebarGroup: React.FC<LojafySidebarGroupProps> = ({
  label,
  children,
  className,
}) => {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;

  return (
    <div className={cn('py-1 px-2 flex flex-col', className)}>
      {label && !isCollapsed && (
        <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
          {label}
        </div>
      )}
      <div className="flex flex-col space-y-0.5">{children}</div>
    </div>
  );
};
