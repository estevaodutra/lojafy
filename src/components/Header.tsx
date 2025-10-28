import { Search, User, Heart, ShoppingCart, Menu, LogOut, Settings, X, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useNavigate } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { useState } from "react";
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { NotificationBell } from "@/components/NotificationBell";

const Header = () => {
  const { favoritesCount } = useFavorites();
  const { itemsCount } = useCart();
  const { user, signOut, profile } = useAuth();
  const { role, isSuperAdmin, isSupplier, isReseller } = useUserRole();
  const { config } = useStoreConfig();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/busca?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
      setMobileMenuOpen(false);
    }
  };

  const getPanelRoute = () => {
    switch (role) {
      case 'super_admin':
        return '/super-admin';
      case 'admin':
        return '/admin';
      case 'supplier':
        return '/supplier';
      case 'reseller':
        return '/reseller';
      default:
        return '/minha-conta';
    }
  };

  const getPanelName = () => {
    switch (role) {
      case 'super_admin':
        return 'Painel Super Admin';
      case 'admin':
        return 'Painel Admin';
      case 'supplier':
        return 'Painel Fornecedor';
      case 'reseller':
        return 'Painel Revendedor';
      default:
        return 'Minha Conta';
    }
  };
  
  return (
    <header className="w-full border-b bg-background sticky top-0 z-50">
      {/* Top Bar */}
      <div 
        className="py-2"
        style={{ 
          backgroundColor: config?.header_background_color || '#000000', 
          color: config?.header_message_color || '#ffffff' 
        }}
      >
        <div className="container mx-auto px-4 text-center text-sm">
          {config?.header_message || '🚚 Frete GRÁTIS para compras acima de R$ 199 | 📦 Entrega em todo o Brasil'}
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            {config?.logo_url ? (
              <img src={config.logo_url} alt={config.store_name} className="h-10 w-auto" />
            ) : (
              <div className="w-10 h-10 bg-hero-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
            )}
            <span className="hidden md:block text-2xl font-bold text-foreground">
              {config?.store_name || 'Lojafy'}
            </span>
          </Link>

          {/* Search Bar - Desktop only */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 md:mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-12 py-2 md:py-3 w-full rounded-lg border-border text-sm md:text-base"
              />
              <Button 
                type="submit"
                size="sm" 
                className="absolute right-1 top-1 h-6 md:h-8 px-2 md:px-3 bg-primary hover:bg-primary/90"
              >
                <Search className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </form>
          </div>

          {/* Actions - Desktop only */}
          <div className="hidden md:flex items-center space-x-2">

            {/* User Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex flex-col items-center p-1 sm:p-2 min-w-[44px]">
                    <Avatar className="h-4 w-4 sm:h-5 sm:w-5">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs hidden sm:block">
                      {profile?.first_name ? `${profile.first_name}` : 'Conta'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/minha-conta" className="w-full">
                      <User className="mr-2 h-4 w-4" />
                      Minha Conta
                    </Link>
                  </DropdownMenuItem>
                  {role !== 'customer' && (
                    <DropdownMenuItem asChild>
                      <Link to={getPanelRoute()} className="w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        {getPanelName()}
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="sm" className="flex flex-col items-center p-1 sm:p-2 min-w-[44px]" asChild>
                <Link to="/auth">
                  <User className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-xs hidden sm:block">Entrar</span>
                </Link>
              </Button>
            )}

            {/* Favorites */}
            <Button variant="ghost" size="sm" className="flex flex-col items-center p-1 sm:p-2 relative min-w-[44px]" asChild>
              <Link to="/favoritos">
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs hidden sm:block">Favoritos</span>
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                    {favoritesCount}
                  </span>
                )}
              </Link>
            </Button>

            {/* Notifications */}
            {user && <NotificationBell />}

            {/* Cart */}
            <Button variant="ghost" size="sm" className="flex flex-col items-center p-1 sm:p-2 relative min-w-[44px]" asChild>
              <Link to="/carrinho">
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs hidden sm:block">Carrinho</span>
                {itemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                    {itemsCount}
                  </span>
                )}
              </Link>
            </Button>
          </div>

          {/* Mobile Menu - Only hamburger visible on mobile */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 flex flex-col max-h-screen">
                <SheetHeader className="border-b p-4 flex-shrink-0">
                  <SheetTitle className="text-lg font-bold">Menu</SheetTitle>
                </SheetHeader>
                
                <div className="flex flex-col flex-1 overflow-y-auto">
                  {/* Mobile Search */}
                  <div className="p-4 border-b">
                    <form onSubmit={handleSearch} className="relative">
                      <Input
                        type="text"
                        placeholder="Buscar produtos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-4 pr-12 py-3 w-full rounded-lg"
                      />
                      <Button 
                        type="submit"
                        size="sm" 
                        className="absolute right-1 top-1 h-8 px-3"
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>

                  {/* Navigation Links */}
                  <nav className="flex-1 p-4">
                    <div className="space-y-4">
                      <Link 
                        to="/" 
                        className="block py-2 text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Início
                      </Link>
                      <Link 
                        to="/categorias" 
                        className="block py-2 text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Lançamentos
                      </Link>
                      <Link 
                        to="/promocoes" 
                        className="block py-2 text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Promoções
                      </Link>
                      <Link 
                        to="/categorias" 
                        className="block py-2 text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Categorias
                      </Link>
                      <Link 
                        to="/ranking-produtos" 
                        className="flex items-center gap-2 py-2 text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Trophy className="w-4 h-4" />
                        Ranking
                      </Link>
                      <Link 
                        to="/contato" 
                        className="block py-2 text-foreground hover:text-primary transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Contato
                      </Link>
                    </div>
                  </nav>

                  {/* Quick Actions - Favorites & Cart */}
                  <div className="border-t p-4">
                    <div className="flex gap-3 mb-4">
                      <Link 
                        to="/favoritos" 
                        className="flex-1 flex items-center justify-center py-3 border rounded-lg hover:bg-muted transition-colors relative"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        <span className="text-sm">Favoritos</span>
                        {favoritesCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {favoritesCount}
                          </span>
                        )}
                      </Link>
                      {user && (
                        <div className="flex items-center justify-center py-3 border rounded-lg">
                          <NotificationBell />
                        </div>
                      )}
                      <Link 
                        to="/carrinho" 
                        className="flex-1 flex items-center justify-center py-3 border rounded-lg hover:bg-muted transition-colors relative"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        <span className="text-sm">Carrinho</span>
                        {itemsCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {itemsCount}
                          </span>
                        )}
                      </Link>
                    </div>

                    {/* User Section */}
                    {user ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile?.avatar_url} />
                            <AvatarFallback>
                              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {profile?.first_name ? `${profile.first_name}` : 'Minha Conta'}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Link 
                            to="/minha-conta" 
                            className="block py-2 pl-2 text-sm text-foreground hover:text-primary transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <User className="inline mr-2 h-4 w-4" />
                            Minha Conta
                          </Link>
                          {role !== 'customer' && (
                            <Link 
                              to={getPanelRoute()} 
                              className="block py-2 pl-2 text-sm text-foreground hover:text-primary transition-colors"
                              onClick={() => setMobileMenuOpen(false)}
                            >
                              <Settings className="inline mr-2 h-4 w-4" />
                              {getPanelName()}
                            </Link>
                          )}
                          <button 
                            onClick={() => {
                              signOut();
                              setMobileMenuOpen(false);
                            }}
                            className="block w-full text-left py-2 pl-2 text-sm text-foreground hover:text-primary transition-colors"
                          >
                            <LogOut className="inline mr-2 h-4 w-4" />
                            Sair
                          </button>
                        </div>
                      </div>
                    ) : (
                      <Link 
                        to="/auth" 
                        className="flex items-center justify-center py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Entrar
                      </Link>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>

        </div>

        {/* Navigation Menu */}
        <nav className="hidden md:flex items-center space-x-8 mt-4">
          <Button variant="ghost" className="text-foreground hover:text-primary" asChild>
            <Link to="/">Início</Link>
          </Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" asChild>
            <Link to="/categorias">Lançamentos</Link>
          </Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" asChild>
            <Link to="/promocoes">Promoções</Link>
          </Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" asChild>
            <Link to="/categorias">Categorias</Link>
          </Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" asChild>
            <Link to="/ranking-produtos" className="flex items-center gap-1">
              <Trophy className="w-4 h-4" />
              Ranking
            </Link>
          </Button>
          <Button variant="ghost" className="text-foreground hover:text-primary" asChild>
            <Link to="/contato">Contato</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;