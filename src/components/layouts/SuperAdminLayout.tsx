import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  ShoppingCart, 
  Settings, 
  Store, 
  UserCog, 
  BarChart3,
  Shield,
  Palette,
  Megaphone,
  LogOut,
  Truck,
  BookOpen,
  Bell,
  Headphones,
  FileText,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

const superAdminMenuItems = [
  {
    title: 'Dashboard',
    url: '/super-admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Usuários',
    url: '/super-admin/usuarios',
    icon: Users,
  },
  {
    title: 'Notificações',
    url: '/super-admin/notificacoes',
    icon: Bell,
  },
  {
    title: 'Produtos',
    url: '/super-admin/produtos',
    icon: Package,
  },
  {
    title: 'Pedidos',
    url: '/super-admin/pedidos',
    icon: ShoppingCart,
  },
  {
    title: 'Lojafy Academy',
    url: '/super-admin/aulas',
    icon: BookOpen,
  },
  {
    title: 'Frete',
    url: '/super-admin/frete',
    icon: Truck,
  },
  {
    title: 'Plataforma',
    url: '/super-admin/plataforma',
    icon: Shield,
  },
  {
    title: 'Financeiro',
    url: '/super-admin/financeiro',
    icon: DollarSign,
  },
  {
    title: 'Integrações',
    url: '/super-admin/integracoes',
    icon: Settings,
  },
];

const supportMenuItems = [
  {
    title: 'Chat de Suporte',
    url: '/super-admin/chat-suporte',
    icon: MessageSquare,
  },
  {
    title: 'Base de Conhecimento',
    url: '/super-admin/base-conhecimento',
    icon: BookOpen,
  },
  {
    title: 'Config. Suporte IA',
    url: '/super-admin/suporte',
    icon: Headphones,
  },
];

const designMenuItems = [
  {
    title: 'Homepage',
    url: '/super-admin/homepage',
    icon: Store,
  },
  {
    title: 'Visual',
    url: '/super-admin/configuracao-visual',
    icon: Palette,
  },
  {
    title: 'Banners',
    url: '/super-admin/banners',
    icon: Megaphone,
  },
  {
    title: 'Categorias',
    url: '/super-admin/categorias',
    icon: Package,
  },
];

const SuperAdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="p-4">
          <h2 className="text-lg font-semibold">Super Admin</h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {superAdminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={currentPath === item.url ? 'bg-sidebar-accent' : ''}
                  >
                    <button onClick={() => navigate(item.url)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
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
                  <SidebarMenuButton 
                    asChild
                    className={currentPath === item.url ? 'bg-sidebar-accent' : ''}
                  >
                    <button onClick={() => navigate(item.url)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Suporte</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {supportMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild
                    className={currentPath === item.url ? 'bg-sidebar-accent' : ''}
                  >
                    <button onClick={() => navigate(item.url)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </button>
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
                  <button onClick={() => navigate('/?view=store')}>
                    <Store className="mr-2 h-4 w-4" />
                    <span>Ver Loja</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <button onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export const SuperAdminLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SuperAdminSidebar />
        <main className="flex-1">
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
          </header>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};