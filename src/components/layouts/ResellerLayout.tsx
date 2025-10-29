import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  BarChart3, 
  DollarSign,
  Users,
  Store,
  LogOut,
  Package,
  Target,
  FileText,
  Gift,
  Image
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
import { PremiumBadge } from '@/components/premium/PremiumBadge';

const resellerMenuItems = [
  {
    title: 'Dashboard',
    url: '/reseller/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Catálogo',
    url: '/reseller/catalogo',
    icon: Package,
  },
  {
    title: 'Meus Produtos',
    url: '/reseller/produtos',
    icon: Package,
  },
  {
    title: 'Minha Loja',
    url: '/reseller/loja',
    icon: Store,
  },
  {
    title: 'Vantagens',
    url: '/reseller/vantagens',
    icon: Gift,
  },
  {
    title: 'Páginas',
    url: '/reseller/paginas',
    icon: FileText,
  },
  {
    title: 'Banners',
    url: '/reseller/banners',
    icon: Image,
  },
  {
    title: 'Vendas',
    url: '/reseller/vendas',
    icon: ShoppingCart,
  },
  {
    title: 'Financeiro',
    url: '/reseller/financeiro',
    icon: DollarSign,
  },
  {
    title: 'Clientes',
    url: '/reseller/clientes',
    icon: Users,
  },
  {
    title: 'Metas',
    url: '/reseller/metas',
    icon: Target,
  },
];

const ResellerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const currentPath = location.pathname;

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Revendedor</h2>
          {profile?.subscription_plan && (
            <PremiumBadge plan={profile.subscription_plan} />
          )}
        </div>
        
        <SidebarGroup>
          <SidebarGroupLabel>Vendas</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {resellerMenuItems.map((item) => (
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
                  <button onClick={() => navigate('/')}>
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

export const ResellerLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <ResellerSidebar />
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