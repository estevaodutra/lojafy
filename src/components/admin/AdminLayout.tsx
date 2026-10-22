import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarProvider, 
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { 
  BarChart3, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  Home, 
  Image, 
  Globe, 
  MessageSquare, 
  Mail, 
  Palette, 
  Truck, 
  Loader2 
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LojafySidebarHeader,
  LojafySidebarItem,
  LojafySidebarFooter,
  LojafySidebarGroup,
} from '@/components/navigation';

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: BarChart3, exactMatch: true },
  { title: 'Produtos', url: '/admin/produtos', icon: Package },
  { title: 'Categorias', url: '/admin/categorias', icon: Package },
  { title: 'Pedidos', url: '/admin/pedidos', icon: ShoppingCart },
  { title: 'Frete', url: '/admin/frete', icon: Truck },
  { title: 'Clientes', url: '/admin/clientes', icon: Users },
  { title: 'Integrações', url: '/admin/integracoes', icon: Settings },
];

const designMenuItems = [
  { title: 'Visão Geral', url: '/admin/homepage', icon: Globe },
  { title: 'Configuração Visual', url: '/admin/configuracao-visual', icon: Palette },
  { title: 'Banners', url: '/admin/banners', icon: Image },
  { title: 'Depoimentos', url: '/admin/depoimentos', icon: MessageSquare },
  { title: 'Newsletter', url: '/admin/newsletter-config', icon: Mail },
];

const AdminSidebar = () => {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar font-sans select-none">
      {/* 1. Header with Lojafy Logo */}
      <LojafySidebarHeader
        environmentName="Administrador"
        dashboardUrl="/admin"
      />

      {/* 2. Independent Scrollable Menu Body */}
      <SidebarContent className="px-2 py-2 gap-1 overflow-y-auto">
        <LojafySidebarGroup label="Administração">
          {adminMenuItems.map((item) => (
            <LojafySidebarItem
              key={item.title}
              title={item.title}
              url={item.url}
              icon={item.icon}
              exactMatch={item.exactMatch}
            />
          ))}
        </LojafySidebarGroup>

        <LojafySidebarGroup label="Design da Loja">
          {designMenuItems.map((item) => (
            <LojafySidebarItem
              key={item.title}
              title={item.title}
              url={item.url}
              icon={item.icon}
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

export const AdminLayout: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden min-w-0 bg-background">
        <AdminSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="h-14 flex items-center justify-between px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shrink-0">
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

export default AdminLayout;
