import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarProvider, 
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { 
  User, 
  Package, 
  Heart, 
  HelpCircle, 
  Settings, 
  Home, 
  GraduationCap, 
  Ticket, 
  Rocket, 
  Wallet 
} from 'lucide-react';
import { useFeature } from '@/hooks/useFeature';
import {
  LojafySidebarHeader,
  LojafySidebarItem,
  LojafySidebarFooter,
  LojafySidebarGroup,
} from '@/components/navigation';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  exactMatch?: boolean;
}

const baseMenuItems: MenuItem[] = [
  { title: 'Resumo', url: '/minha-conta', icon: User, exactMatch: true },
  { title: 'Meus Pedidos', url: '/minha-conta/pedidos', icon: Package },
  { title: 'Carteira', url: '/minha-conta/carteira', icon: Wallet },
  { title: 'Meus Tickets', url: '/minha-conta/tickets', icon: Ticket },
  { title: 'Favoritos', url: '/minha-conta/favoritos', icon: Heart },
  { title: 'Meu Perfil', url: '/minha-conta/configuracoes', icon: Settings },
  { title: 'Ajuda', url: '/minha-conta/ajuda', icon: HelpCircle },
];

const CustomerSidebar = () => {
  const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');
  const { hasFeature: hasAcademyFeature } = useFeature('lojafy_academy');

  const menuItems = useMemo(() => {
    const items = [...baseMenuItems];
    
    // Adicionar Academy apenas para quem tem a feature
    if (hasAcademyFeature) {
      items.push({ title: 'Lojafy Academy', url: '/minha-conta/academy', icon: GraduationCap });
    }
    
    // Adicionar Meus Acessos apenas para quem tem a feature
    if (hasTop10Feature) {
      items.push({ title: 'Meus Acessos', url: '/minha-conta/meus-acessos', icon: Rocket });
    }
    
    return items;
  }, [hasAcademyFeature, hasTop10Feature]);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar font-sans select-none">
      {/* 1. Header with Lojafy Logo */}
      <LojafySidebarHeader
        environmentName="Minha Conta"
        dashboardUrl="/minha-conta"
      />

      {/* 2. Independent Scrollable Menu Body */}
      <SidebarContent className="px-2 py-2 gap-1 overflow-y-auto">
        <LojafySidebarGroup label="Minha Conta">
          {menuItems.map((item) => (
            <LojafySidebarItem
              key={item.title}
              title={item.title}
              url={item.url}
              icon={item.icon}
              exactMatch={item.exactMatch}
            />
          ))}
        </LojafySidebarGroup>
      </SidebarContent>

      {/* 3. Fixed Footer */}
      <LojafySidebarFooter
        actionItems={[
          {
            title: 'Voltar à Loja',
            url: '/',
            icon: Home,
          },
        ]}
        customStoreUrl="/"
        storeLabel="Voltar à Loja"
      />

      <SidebarRail />
    </Sidebar>
  );
};

export const CustomerLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden min-w-0 bg-background">
        <CustomerSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="h-14 flex items-center border-b px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
          </header>
          <div className="p-4 md:p-6 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default CustomerLayout;
