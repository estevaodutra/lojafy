import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  DollarSign,
  Users,
  Store,
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
  GraduationCap,
} from 'lucide-react';
import { useFeature } from '@/hooks/useFeature';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useResellerStore } from '@/hooks/useResellerStore';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { WelcomeResellerModal } from '@/components/reseller/WelcomeResellerModal';
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
  badge?: string;
  aliases?: string[];
  exactMatch?: boolean;
}

interface MenuGroup {
  label: string;
  items: MenuItem[];
}

const baseMenuGroups: MenuGroup[] = [
  {
    label: 'Principal',
    items: [
      { title: 'Dashboard', url: '/reseller/dashboard', icon: LayoutDashboard, aliases: ['/reseller'], exactMatch: true },
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
];

const ResellerSidebar = () => {
  const { profile } = useAuth();
  const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');
  const { hasFeature: hasAcademyFeature } = useFeature('lojafy_academy');
  const { hasFeature: hasIntegraFeature } = useFeature('lojafy_integra');
  const { store: resellerStore } = useResellerStore();

  const menuGroups = useMemo(() => {
    const groups = [...baseMenuGroups];

    if (hasAcademyFeature) {
      groups.push({
        label: 'Aprendizado',
        items: [
          { title: 'Lojafy Academy', url: '/minha-conta/academy', icon: GraduationCap },
        ]
      });
    }

    if (hasTop10Feature) {
      groups.push({
        label: 'Meus Acessos',
        items: [
          { title: 'Top 10 Produtos', url: '/reseller/meus-acessos/top-produtos', icon: Trophy, badge: 'Novo' },
        ]
      });
    }

    if (hasIntegraFeature) {
      groups.push({
        label: 'Avançado',
        items: [
          { title: 'Lojafy Integra', url: '/reseller/integracoes', icon: Plug },
        ]
      });
    }

    return groups;
  }, [hasTop10Feature, hasAcademyFeature, hasIntegraFeature]);

  const storeUrl = resellerStore?.store_slug ? `/loja/${resellerStore.store_slug}` : '/';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar font-sans select-none">
      {/* 1. Header with Lojafy Logo & Plan Badge */}
      <LojafySidebarHeader
        environmentName="Revendedor"
        dashboardUrl="/reseller/dashboard"
        badge={
          profile?.subscription_plan ? (
            <PremiumBadge plan={profile.subscription_plan} />
          ) : undefined
        }
      />

      {/* 2. Independent Scrollable Menu Body */}
      <SidebarContent className="px-2 py-2 gap-1 overflow-y-auto">
        {menuGroups.map((group) => (
          <LojafySidebarGroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <LojafySidebarItem
                key={item.title}
                title={item.title}
                url={item.url}
                icon={item.icon}
                badge={item.badge}
                aliases={item.aliases}
                exactMatch={item.exactMatch}
              />
            ))}
          </LojafySidebarGroup>
        ))}
      </SidebarContent>

      {/* 3. Fixed Footer */}
      <LojafySidebarFooter
        actionItems={[
          {
            title: 'Ver Minha Loja',
            url: storeUrl,
            icon: Store,
          },
          {
            title: 'Ver Catálogo',
            url: '/?viewCatalog=true',
            icon: ShoppingBag,
          },
        ]}
        customStoreUrl={storeUrl}
        storeLabel="Ver Minha Loja"
      />

      <SidebarRail />
    </Sidebar>
  );
};

export const ResellerLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <WelcomeResellerModal />
      <div className="min-h-screen flex w-full overflow-x-hidden min-w-0 bg-background">
        <ResellerSidebar />
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
