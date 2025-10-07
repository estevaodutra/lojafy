import React from 'react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { User, Package, MapPin, Heart, HelpCircle, Settings, Home, LogOut, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const customerMenuItems = [
  { title: 'Resumo', url: '/minha-conta', icon: User },
  { title: 'Meus Pedidos', url: '/minha-conta/pedidos', icon: Package },
  { title: 'Catálogo de Cursos', url: '/minha-conta/catalogo-aulas', icon: BookOpen },
  { title: 'Minhas Aulas', url: '/minha-conta/aulas', icon: GraduationCap },
  { title: 'Favoritos', url: '/minha-conta/favoritos', icon: Heart },
  { title: 'Meu Perfil', url: '/minha-conta/configuracoes', icon: Settings },
  { title: 'Ajuda', url: '/minha-conta/ajuda', icon: HelpCircle },
];

const CustomerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

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
              {customerMenuItems.map((item) => (
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