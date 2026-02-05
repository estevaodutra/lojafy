import React, { useMemo } from 'react';
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
  Image,
  ShoppingBag,
  Settings,
  Plug,
  Ticket,
  Truck,
  Star,
  TrendingUp,
  Trophy,
  GraduationCap
} from 'lucide-react';
import { useFeature } from '@/hooks/useFeature';
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
import { Badge } from '@/components/ui/badge';
import { WelcomeResellerModal } from '@/components/reseller/WelcomeResellerModal';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', url: '/reseller/dashboard', icon: LayoutDashboard },
    ]
  },
  {
    label: 'Produtos',
    items: [
      { title: 'Catálogo', url: '/reseller/catalogo', icon: ShoppingBag },
      { title: 'Meus Produtos', url: '/reseller/produtos', icon: Package },
    ]
  },
  {
    label: 'Vendas & Finanças',
    items: [
      { title: 'Pedidos', url: '/reseller/pedidos', icon: Package },
      { title: 'Vendas', url: '/reseller/vendas', icon: ShoppingCart },
      { title: 'Relatórios', url: '/reseller/relatorios', icon: TrendingUp },
      { title: 'Financeiro', url: '/reseller/financeiro', icon: DollarSign },
      { title: 'Clientes', url: '/reseller/clientes', icon: Users },
      { title: 'Metas', url: '/reseller/metas', icon: Target },
    ]
  },
  {
    label: 'Minha Loja',
    items: [
      { title: 'Configurar Loja', url: '/reseller/loja', icon: Settings },
      { title: 'Páginas', url: '/reseller/paginas', icon: FileText },
      { title: 'Banners', url: '/reseller/banners', icon: Image },
      { title: 'Vantagens', url: '/reseller/vantagens', icon: Gift },
      { title: 'Cupons', url: '/reseller/cupons', icon: Ticket },
      { title: 'Frete', url: '/reseller/frete', icon: Truck },
      { title: 'Depoimentos', url: '/reseller/depoimentos', icon: Star },
    ]
  },
  // Avançado agora é adicionado condicionalmente no filteredMenuGroups
];

const ResellerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');
  const { hasFeature: hasAcademyFeature } = useFeature('lojafy_academy');
  const { hasFeature: hasIntegraFeature } = useFeature('lojafy_integra');
  const currentPath = location.pathname;

  const filteredMenuGroups = useMemo(() => {
    const groups = [...menuGroups];
    
    // Adicionar Academy apenas para quem tem a feature
    if (hasAcademyFeature) {
      groups.push({
        label: 'Aprendizado',
        items: [
          { title: 'Lojafy Academy', url: '/minha-conta/academy', icon: GraduationCap },
        ]
      });
    }
    
    // Adicionar Meus Acessos apenas para quem tem a feature
    if (hasTop10Feature) {
      groups.push({
        label: 'Meus Acessos',
        items: [
          { title: 'Top 10 Produtos Vencedores', url: '/reseller/meus-acessos/top-produtos', icon: Trophy, badge: 'Novo' },
        ]
      });
    }
    
    // Adicionar Avançado apenas para quem tem a feature Integra
    if (hasIntegraFeature) {
      groups.push({
        label: 'Avançado',
        items: [
          { title: 'Integrações', url: '/reseller/integracoes', icon: Plug },
        ]
      });
    }
    
    return groups;
  }, [hasTop10Feature, hasAcademyFeature, hasIntegraFeature]);

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <Sidebar className="border-r">
      <SidebarContent>
        <div className="p-4 flex items-center justify-between border-b">
          <h2 className="text-lg font-semibold">Revendedor</h2>
          {profile?.subscription_plan && (
            <PremiumBadge plan={profile.subscription_plan} />
          )}
        </div>
        
        {filteredMenuGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild
                      className={currentPath === item.url ? 'bg-sidebar-accent' : ''}
                    >
                      <button onClick={() => navigate(item.url)} className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <item.icon className="mr-2 h-4 w-4" />
                          <span>{item.title}</span>
                        </div>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="bg-primary/10 hover:bg-primary/20">
                  <button onClick={() => navigate('/')}>
                    <Store className="mr-2 h-4 w-4 text-primary" />
                    <span className="font-medium text-primary">Ver Minha Loja</span>
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
      <WelcomeResellerModal />
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