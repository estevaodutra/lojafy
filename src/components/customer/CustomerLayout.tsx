import React, { useMemo } from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { User, Package, Heart, HelpCircle, Settings, Home, LogOut, GraduationCap, Ticket, Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFeature } from '@/hooks/useFeature';

const baseMenuItems = [
  { title: 'Resumo', url: '/minha-conta', icon: User },
  { title: 'Meus Pedidos', url: '/minha-conta/pedidos', icon: Package },
  { title: 'Meus Tickets', url: '/minha-conta/tickets', icon: Ticket },
  { title: 'Favoritos', url: '/minha-conta/favoritos', icon: Heart },
  { title: 'Meu Perfil', url: '/minha-conta/configuracoes', icon: Settings },
  { title: 'Ajuda', url: '/minha-conta/ajuda', icon: HelpCircle },
];

const CustomerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
  const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');
  const { hasFeature: hasAcademyFeature } = useFeature('lojafy_academy');
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const menuItems = useMemo(() => {
    const items = [...baseMenuItems];
    
    // Adicionar Academy apenas para quem tem a feature
    if (hasAcademyFeature) {
      items.push({ title: 'Lojafy Academy', url: '/minha-conta/academy', icon: GraduationCap });
    }
    
    // Adicionar Meus Acessos apenas para quem tem a feature
    if (hasTop10Feature) {
      items.push({ title: 'Meus Acessos', url: '/minha-conta/meus-acessos', icon: Rocket });
    }
    
    return items;
  }, [hasAcademyFeature, hasTop10Feature]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <Sidebar className="w-64">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Minha Conta</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
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
                  <button onClick={() => navigate('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Voltar à Loja</span>
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

const CustomerLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <CustomerSidebar />
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

export default CustomerLayout;