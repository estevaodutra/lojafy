import React from 'react';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Store,
  ShoppingCart,
  CheckCircle,
  Hand,
  PackageOpen,
  Send,
  Tag,
  AlertTriangle,
  History,
  Upload,
  Building2,
  Truck,
  MapPin,
  Layers,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
} from '@/components/ui/sidebar';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { AlertsStrip } from '@/components/supplier/dashboard/AlertsStrip';
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

const operationItems: MenuItem[] = [
  { title: 'Dashboard', url: '/supplier', icon: LayoutDashboard, exactMatch: true },
  { title: 'Pedidos', url: '/supplier/pedidos', icon: ShoppingCart },
  { title: 'Separação', url: '/supplier/separacao', icon: Hand },
  { title: 'Embalagem', url: '/supplier/embalagem', icon: PackageOpen },
  { title: 'Expedição', url: '/supplier/expedicao', icon: Send },
  { title: 'Etiquetas', url: '/supplier/etiquetas', icon: Tag },
  { title: 'Ocorrências', url: '/supplier/ocorrencias', icon: AlertTriangle },
];

const catalogItems: MenuItem[] = [
  { title: 'Meus Produtos', url: '/supplier/produtos', icon: Package },
  { title: 'Produtos para Aprovação', url: '/supplier/produtos/aprovacao', icon: CheckCircle },
  { title: 'Categorias', url: '/supplier/categorias', icon: Layers },
  { title: 'Estoque', url: '/supplier/estoque', icon: Warehouse },
  { title: 'Movimentações', url: '/supplier/movimentacoes', icon: History },
  { title: 'Importação', url: '/supplier/importacao', icon: Upload },
];

const settingsItems: MenuItem[] = [
  { title: 'Empresa', url: '/supplier/configuracoes/empresa', icon: Building2 },
  { title: 'Logística', url: '/supplier/configuracoes/logistica', icon: Truck },
  { title: 'Depósitos', url: '/supplier/configuracoes/depositos', icon: MapPin },
];

const SupplierSidebar = () => {
  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar font-sans select-none">
      {/* 1. Header with Lojafy Logo */}
      <LojafySidebarHeader
        environmentName="Fornecedor"
        dashboardUrl="/supplier"
      />

      {/* 2. Independent Scrollable Menu Body */}
      <SidebarContent className="px-2 py-2 gap-1 overflow-y-auto">
        <LojafySidebarGroup label="Operação">
          {operationItems.map((item) => (
            <LojafySidebarItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
              exactMatch={item.exactMatch}
            />
          ))}
        </LojafySidebarGroup>

        <LojafySidebarGroup label="Catálogo">
          {catalogItems.map((item) => (
            <LojafySidebarItem
              key={item.url}
              title={item.title}
              url={item.url}
              icon={item.icon}
            />
          ))}
        </LojafySidebarGroup>

        <LojafySidebarGroup label="Configurações">
          {settingsItems.map((item) => (
            <LojafySidebarItem
              key={item.url}
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
            title: 'Ver Loja',
            url: '/',
            icon: Store,
          },
        ]}
        customStoreUrl="/"
        storeLabel="Ver Loja"
      />

      <SidebarRail />
    </Sidebar>
  );
};

export const SupplierLayout: React.FC = () => {
  const { data: orgData } = useSupplierOrganization();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden min-w-0 bg-background">
        <SupplierSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="h-14 flex items-center gap-3 border-b px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger />
            {orgData?.organization && (
              <span className="text-sm font-medium text-muted-foreground truncate">
                {orgData.organization.trade_name || orgData.organization.legal_name || 'Minha organização'}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <AlertsStrip />
            </div>
          </header>
          <div className="p-4 md:p-6 flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden">
            <Outlet />
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
