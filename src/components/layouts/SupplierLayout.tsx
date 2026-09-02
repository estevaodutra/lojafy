import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Store,
  LogOut,
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
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { AlertsStrip } from '@/components/supplier/dashboard/AlertsStrip';

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const operationItems: MenuItem[] = [
  { title: 'Dashboard', url: '/supplier', icon: LayoutDashboard },
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

const MenuGroup = ({ label, items }: { label: string; items: MenuItem[] }) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                className={location.pathname === item.url ? 'bg-sidebar-accent' : ''}
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
  );
};

const SupplierSidebar = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <div className="p-4">
          <h2 className="text-lg font-semibold">Fornecedor</h2>
        </div>

        <MenuGroup label="Operação" items={operationItems} />
        <MenuGroup label="Catálogo" items={catalogItems} />
        <MenuGroup label="Configurações" items={settingsItems} />

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
                  <button onClick={() => signOut()}>
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

export const SupplierLayout: React.FC = () => {
  const { data: orgData } = useSupplierOrganization();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden min-w-0">
        <SupplierSidebar />
        <main className="flex-1 min-w-0 flex flex-col overflow-x-hidden">
          <header className="h-12 flex items-center gap-3 border-b px-4 shrink-0 bg-background">
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
