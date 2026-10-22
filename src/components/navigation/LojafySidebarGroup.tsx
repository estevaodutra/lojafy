import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/components/ui/sidebar';

interface SidebarAccordionContextValue {
  openCollapseId: string | null;
  toggleCollapse: (id: string) => void;
  setOpenCollapseId: (id: string | null) => void;
}

export const SidebarAccordionContext = createContext<SidebarAccordionContextValue | null>(null);

export const useSidebarAccordion = () => useContext(SidebarAccordionContext);

interface LojafySidebarGroupProps {
  label?: string;
  accordion?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const LojafySidebarGroup: React.FC<LojafySidebarGroupProps> = ({
  label,
  accordion = false,
  children,
  className,
}) => {
  const { state, isMobile } = useSidebar();
  const isCollapsed = state === 'collapsed' && !isMobile;
  const [openCollapseId, setOpenCollapseId] = useState<string | null>(null);

  const toggleCollapse = (id: string) => {
    setOpenCollapseId((prev) => (prev === id ? null : id));
  };

  const groupContent = (
    <div className={cn('py-1 px-2 flex flex-col', className)}>
      {label && !isCollapsed && (
        <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 select-none">
          {label}
        </div>
      )}
      <div className="flex flex-col space-y-0.5">{children}</div>
    </div>
  );

  if (accordion) {
    return (
      <SidebarAccordionContext.Provider
        value={{
          openCollapseId,
          toggleCollapse,
          setOpenCollapseId,
        }}
      >
        {groupContent}
      </SidebarAccordionContext.Provider>
    );
  }

  return groupContent;
};
