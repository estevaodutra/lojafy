import React from 'react';
import { Link, useLocation, Outlet, Navigate } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { BarChart3, Package, ShoppingCart, Users, Settings, Home, Image, Globe, Star, MessageSquare, Mail, Palette } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const adminMenuItems = [
  { title: 'Dashboard', url: '/admin', icon: BarChart3 },
  { title: 'Produtos', url: '/admin/produtos', icon: Package },
  { title: 'Categorias Destaque', url: '/admin/categorias-destaque', icon: Star },
  { title: 'Produtos Destaque', url: '/admin/produtos-destaque', icon: Star },
  { title: 'Pedidos', url: '/admin/pedidos', icon: ShoppingCart },
  { title: 'Clientes', url: '/admin/clientes', icon: Users },
  { title: 'Integracoes', url: '/admin/integracoes', icon: Settings },
];

const designMenuItems = [
  { title: 'Visão Geral', url: '/admin/homepage', icon: Globe },
  { title: 'Banners', url: '/admin/banners', icon: Image },
  { title: 'Depoimentos', url: '/admin/depoimentos', icon: MessageSquare },
  { title: 'Newsletter', url: '/admin/newsletter-config', icon: Mail },
];

const AdminSidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar className="w-64">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.url}
                      className={isActive(item.url) ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Design da Loja</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {designMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link 
                      to={item.url}
                      className={isActive(item.url) ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link to="/">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Voltar à Loja</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

const AdminLayout: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
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
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <main className="flex-1 p-6">
          <div className="mb-6">
            <SidebarTrigger className="md:hidden" />
          </div>
          <Outlet />
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;