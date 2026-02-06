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
  DollarSign,
  GraduationCap,
  Code,
  Sparkles
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
    title: 'Catálogo',
    url: '/super-admin/catalogo',
    icon: Package,
  },
  {
    title: 'Pedidos',
    url: '/super-admin/pedidos',
    icon: ShoppingCart,
  },
  {
    title: 'Clientes',
    url: '/super-admin/clientes',
    icon: Users,
  },
  {
    title: 'Design',
    url: '/super-admin/design',
    icon: Palette,
  },
  {
    title: 'Configurações',
    url: '/super-admin/configuracoes',
    icon: Settings,
  },
  {
    title: 'Financeiro',
    url: '/super-admin/financeiro',
    icon: DollarSign,
  },
  {
    title: 'Features',
    url: '/super-admin/features',
    icon: Sparkles,
  },
  {
    title: 'API Docs',
    url: '/super-admin/api-docs',
    icon: Code,
  },
];

const supportMenuItems = [
  {
    title: 'Chat de Suporte',
    url: '/super-admin/chat-suporte',
    icon: MessageSquare,
  },
];

const academyMenuItems = [
  {
    title: 'Lojafy Academy',
    url: '/super-admin/academy',
    icon: GraduationCap,
  },
];

const SuperAdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const handleLogout = async () => {
    await signOut();
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
          <SidebarGroupLabel>Academy</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {academyMenuItems.map((item) => (
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
      <div className="h-screen flex w-full overflow-hidden">
        <SuperAdminSidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-12 flex items-center border-b px-4 shrink-0">
            <SidebarTrigger />
          </header>
          <div className="p-6 flex-1 min-h-0 overflow-auto flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};