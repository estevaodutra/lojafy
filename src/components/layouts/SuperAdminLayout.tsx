import React from 'react';
import { Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  MessageSquare, 
  DollarSign, 
  Wallet, 
  BarChart3, 
  Clock, 
  Settings, 
  Code, 
  BookOpen, 
  ScrollText, 
  LayoutGrid, 
  Palette, 
  Sparkles, 
  CreditCard, 
  ShoppingBag, 
  Truck, 
  GraduationCap, 
  Bell, 
  Headphones 
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  LojafySidebarHeader,
  LojafySidebarItem,
  LojafySidebarCollapse,
  LojafySidebarFooter,
  LojafySidebarGroup,
} from '@/components/navigation';

export const SuperAdminSidebar: React.FC = () => {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar font-sans select-none">
      {/* 1. Header with original Lojafy logo and discreet environment label */}
      <LojafySidebarHeader
        environmentName="Super Admin"
        dashboardUrl="/super-admin"
      />

      {/* 2. Independent Scrollable Body with Definitive Architecture v2.2 */}
      <SidebarContent className="px-2 py-3 gap-0 overflow-y-auto">
        <LojafySidebarGroup accordion>
          {/* 01. Dashboard */}
          <LojafySidebarItem
            title="Dashboard"
            url="/super-admin"
            icon={LayoutDashboard}
            exactMatch
          />

          {/* 02. Catálogo */}
          <LojafySidebarItem
            title="Catálogo"
            url="/super-admin/catalogo"
            icon={Package}
          />

          {/* 03. Pedidos */}
          <LojafySidebarItem
            title="Pedidos"
            url="/super-admin/pedidos"
            icon={ShoppingCart}
          />

          {/* 04. Usuários (Renomeado de Clientes) */}
          <LojafySidebarItem
            title="Usuários"
            url="/super-admin/usuarios"
            aliases={['/super-admin/clientes']}
            icon={Users}
          />

          {/* 05. Chat (Imediatamente após Usuários e antes de Financeiro) */}
          <LojafySidebarItem
            title="Chat"
            url="/super-admin/chat-suporte"
            aliases={['/super-admin/chat']}
            icon={MessageSquare}
          />

          {/* 06. Financeiro (Collapse) */}
          <LojafySidebarCollapse
            title="Financeiro"
            icon={DollarSign}
            items={[
              {
                title: 'Gestão de Carteiras',
                url: '/super-admin/financeiro/carteiras',
                icon: Wallet,
              },
              {
                title: 'Transações',
                url: '/super-admin/financeiro/transacoes',
                icon: BarChart3,
              },
              {
                title: 'Solicitações de Saque',
                url: '/super-admin/financeiro/saques',
                icon: Clock,
              },
              {
                title: 'Configurações Financeiras',
                url: '/super-admin/financeiro/configuracoes',
                icon: Settings,
              },
            ]}
          />

          {/* 07. Desenvolvedores (Collapse) */}
          <LojafySidebarCollapse
            title="Desenvolvedores"
            icon={Code}
            items={[
              {
                title: 'Documentação da API',
                url: '/super-admin/api-docs',
                icon: BookOpen,
              },
              {
                title: 'Logs da API',
                url: '/super-admin/logs',
                icon: ScrollText,
              },
            ]}
          />

          {/* 08. Recursos (Último grupo principal - Collapse) */}
          <LojafySidebarCollapse
            title="Recursos"
            icon={LayoutGrid}
            items={[
              {
                title: 'Design',
                url: '/super-admin/design',
                icon: Palette,
              },
              {
                title: 'Features',
                url: '/super-admin/features',
                icon: Sparkles,
              },
              {
                title: 'Planos',
                url: '/super-admin/planos',
                icon: CreditCard,
              },
              {
                title: 'Marketplaces',
                url: '/super-admin/marketplaces',
                icon: ShoppingBag,
              },
              {
                title: 'Logística',
                url: '/super-admin/logistica',
                icon: Truck,
              },
              {
                title: 'Lojafy Academy',
                url: '/super-admin/academy',
                icon: GraduationCap,
              },
              {
                title: 'Gerenciar Recursos',
                url: '/super-admin/recursos',
                aliases: ['/super-admin/apps'],
                icon: LayoutGrid,
              },
            ]}
          />
        </LojafySidebarGroup>
      </SidebarContent>

      {/* 3. Fixed Footer with Notificações, Ajuda, Configurações & User Profile */}
      <LojafySidebarFooter
        actionItems={[
          {
            title: 'Notificações',
            url: '/super-admin/notificacoes',
            icon: Bell,
          },
          {
            title: 'Ajuda',
            url: '/super-admin/ajuda',
            aliases: ['/super-admin/suporte'],
            icon: Headphones,
          },
          {
            title: 'Configurações',
            url: '/super-admin/configuracoes',
            icon: Settings,
          },
        ]}
        customStoreUrl="/?view=store"
        storeLabel="Ver Loja"
      />

      <SidebarRail />
    </Sidebar>
  );
};

export const SuperAdminLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-x-hidden min-w-0 bg-background">
        <SuperAdminSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="h-14 flex items-center border-b px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
          </header>
          <div className="p-4 md:p-6 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
