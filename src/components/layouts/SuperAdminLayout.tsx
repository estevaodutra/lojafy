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
  Sparkles,
  CreditCard,
  ShoppingBag,
  Wallet,
  Clock,
  ScrollText
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
    title: 'Logística',
    url: '/super-admin/logistica',
    icon: Truck,
  },
  {
    title: 'Financeiro',
    icon: DollarSign,
    submenu: [
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
    ]
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
    title: 'API Docs',
    url: '/super-admin/api-docs',
    icon: Code,
  },
  {
    title: 'Logs de API',
    url: '/super-admin/logs',
    icon: ScrollText,
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
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <div className="p-4">
          <h2 className="text-lg font-semibold">Super Admin</h2>
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {superAdminMenuItems.map((item) => {
                const hasSubmenu = 'submenu' in item && !!item.submenu;
                const isSubmenuActive = hasSubmenu && (item.submenu as any[]).some(sub => currentPath === sub.url);
                const isActive = ('url' in item && currentPath === item.url) || isSubmenuActive;

                return (
                  <SidebarMenuItem key={item.title}>
                    {hasSubmenu ? (
                      <>
                        <SidebarMenuButton 
                          className={isActive ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground' : ''}
                          onClick={() => {
                            if ((item.submenu as any[])?.[0]?.url) {
                              navigate((item.submenu as any[])[0].url);
                            }
                          }}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                        <SidebarMenuSub>
                          {(item.submenu as any[]).map((sub) => (
                            <SidebarMenuSubItem key={sub.title}>
                              <SidebarMenuSubButton 
                                asChild
                                isActive={currentPath === sub.url}
                              >
                                <button onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(sub.url);
                                }}>
                                  <sub.icon className="mr-2 h-3.5 w-3.5" />
                                  <span>{sub.title}</span>
                                </button>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </>
                    ) : (
                      <SidebarMenuButton 
                        asChild
                        className={'url' in item && currentPath === item.url ? 'bg-sidebar-accent' : ''}
                      >
                        <button onClick={() => navigate(('url' in item ? item.url : '') as string)}>
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                );
              })}
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
      <div className="h-screen flex w-full overflow-x-hidden min-w-0">
        <SuperAdminSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="h-12 flex items-center border-b px-4 shrink-0 bg-background">
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