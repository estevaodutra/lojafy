import { Search, User, Heart, ShoppingCart, Menu, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const { favoritesCount } = useFavorites();
  const { itemsCount } = useCart();
  const { user, signOut, profile, isAdmin } = useAuth();
  
  return (
    <header className="w-full border-b bg-background sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary text-primary-foreground py-2">
        <div className="container mx-auto px-4 text-center text-sm">
          🚚 Frete GRÁTIS para compras acima de R$ 199 | 📦 Entrega em todo o Brasil
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-hero-gradient rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="text-2xl font-bold text-foreground">EcoShop</span>
          </Link>

          {/* Search Bar - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <Input
                type="text"
                placeholder="Buscar produtos..."
                className="pl-4 pr-12 py-3 w-full rounded-lg border-border"
              />
              <Button 
                size="sm" 
                className="absolute right-1 top-1 h-8 px-3 bg-primary hover:bg-primary/90"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            {/* Mobile Search */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Search className="h-5 w-5" />
            </Button>

            {/* User Account */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="hidden sm:flex flex-col items-center p-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={profile?.avatar_url} />
                      <AvatarFallback>
                        {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">
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
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="w-full">
                        <Settings className="mr-2 h-4 w-4" />
                        Painel Admin
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
              <Button variant="ghost" size="sm" className="hidden sm:flex flex-col items-center p-2" asChild>
                <Link to="/auth">
                  <User className="h-5 w-5" />
                  <span className="text-xs">Entrar</span>
                </Link>
              </Button>
            )}

            {/* Favorites */}
            <Button variant="ghost" size="sm" className="hidden sm:flex flex-col items-center p-2 relative" asChild>
              <Link to="/favoritos">
                <Heart className="h-5 w-5" />
                <span className="text-xs">Favoritos</span>
                {favoritesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {favoritesCount}
                  </span>
                )}
              </Link>
            </Button>

            {/* Cart */}
            <Button variant="ghost" size="sm" className="flex flex-col items-center p-2 relative" asChild>
              <Link to="/carrinho">
                <ShoppingCart className="h-5 w-5" />
                <span className="text-xs">Carrinho</span>
                {itemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {itemsCount}
                  </span>
                )}
              </Link>
            </Button>

            {/* Mobile Menu */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
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
            <Link to="/contato">Contato</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;