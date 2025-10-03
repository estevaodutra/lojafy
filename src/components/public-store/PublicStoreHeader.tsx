import { Search, Heart, ShoppingCart, Menu, MessageCircle, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PublicStoreData } from "@/hooks/usePublicStore";
import { usePublicStoreHeader } from "@/hooks/usePublicStoreHeader";

interface PublicStoreHeaderProps {
  store: PublicStoreData;
}

const PublicStoreHeader = ({ store }: PublicStoreHeaderProps) => {
  const {
    searchTerm,
    setSearchTerm,
    mobileMenuOpen,
    setMobileMenuOpen,
    handleSearch,
    handleWhatsAppContact,
    user,
    profile,
    handleLogin,
    handleProfile
  } = usePublicStoreHeader(store);

  return (
    <header className="w-full border-b bg-background sticky top-0 z-50">
      {/* Top Bar */}
      <div 
        className="py-2"
        style={{ 
          backgroundColor: store.primary_color || '#000000', 
          color: store.primary_color === '#000000' ? '#ffffff' : '#000000'
        }}
      >
        <div className="container mx-auto px-4 text-center text-sm">
          <span>🛍️ Loja de {store.store_name} | 📱 Vendas Online</span>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Back Button & Logo */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/loja/${store.store_slug}`}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Voltar</span>
              </Link>
            </Button>
            
            <div className="flex items-center space-x-2">
              {store.logo_url && (
                <img 
                  src={store.logo_url} 
                  alt={store.store_name}
                  className="h-10 w-auto"
                />
              )}
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                {store.store_name}
              </h1>
            </div>
          </div>

          {/* Search Bar - Desktop only */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 md:mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <Input
                type="text"
                placeholder="Buscar produtos na loja..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4 pr-12 py-2 md:py-3 w-full rounded-lg border-border text-sm md:text-base"
              />
              <Button 
                type="submit"
                size="sm" 
                className="absolute right-1 top-1 h-6 md:h-8 px-2 md:px-3"
                style={{ backgroundColor: store.accent_color }}
              >
                <Search className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </form>
          </div>

          {/* Actions - Desktop only */}
          <div className="hidden md:flex items-center space-x-2">
            {store.whatsapp && (
              <Button 
                onClick={handleWhatsAppContact}
                className="text-white"
                style={{ backgroundColor: store.accent_color }}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}

            {/* Login/Profile */}
            {user ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col items-center p-1 sm:p-2 min-w-[44px]"
                onClick={handleProfile}
              >
                <User className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs hidden sm:block">
                  {profile?.first_name || 'Perfil'}
                </span>
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogin}
                className="gap-2"
              >
                <User className="h-4 w-4" />
                <span>Entrar</span>
              </Button>
            )}

            {/* Favorites */}
            <Button variant="ghost" size="sm" className="flex flex-col items-center p-1 sm:p-2 min-w-[44px]" asChild>
              <Link to={`/loja/${store.store_slug}/favoritos`}>
                <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs hidden sm:block">Favoritos</span>
              </Link>
            </Button>

            {/* Cart */}
            <Button variant="ghost" size="sm" className="flex flex-col items-center p-1 sm:p-2 min-w-[44px]" asChild>
              <Link to={`/loja/${store.store_slug}/carrinho`}>
                <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-xs hidden sm:block">Carrinho</span>
              </Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 p-0 flex flex-col max-h-screen">
                <SheetHeader className="border-b p-4 flex-shrink-0">
                  <SheetTitle className="text-lg font-bold">{store.store_name}</SheetTitle>
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
                        style={{ backgroundColor: store.accent_color }}
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>

                  {/* Navigation Links */}
                  <div className="border-t p-4">
                    <div className="space-y-2 mb-4">
                      <Link 
                        to={`/loja/${store.store_slug}/produtos`}
                        className="flex items-center py-3 px-4 text-left hover:bg-muted transition-colors rounded-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">Todos os Produtos</span>
                      </Link>
                      <Link 
                        to={`/loja/${store.store_slug}/categorias`}
                        className="flex items-center py-3 px-4 text-left hover:bg-muted transition-colors rounded-lg"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <span className="text-sm font-medium">Categorias</span>
                      </Link>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-2 mb-4 pt-4 border-t">
                      {/* Login/Profile Mobile */}
                      {user ? (
                        <button
                          onClick={() => {
                            handleProfile();
                            setMobileMenuOpen(false);
                          }}
                          className="flex flex-col items-center justify-center py-3 border rounded-lg hover:bg-muted transition-colors"
                        >
                          <User className="h-4 w-4 mb-1" />
                          <span className="text-xs">{profile?.first_name || 'Perfil'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleLogin();
                            setMobileMenuOpen(false);
                          }}
                          className="flex flex-col items-center justify-center py-3 border rounded-lg hover:bg-muted transition-colors"
                        >
                          <User className="h-4 w-4 mb-1" />
                          <span className="text-xs">Entrar</span>
                        </button>
                      )}

                      {/* Favorites Mobile */}
                      <Link 
                        to={`/loja/${store.store_slug}/favoritos`}
                        className="flex flex-col items-center justify-center py-3 border rounded-lg hover:bg-muted transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Heart className="h-4 w-4 mb-1" />
                        <span className="text-xs">Favoritos</span>
                      </Link>

                      {/* Cart Mobile */}
                      <Link 
                        to={`/loja/${store.store_slug}/carrinho`}
                        className="flex flex-col items-center justify-center py-3 border rounded-lg hover:bg-muted transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ShoppingCart className="h-4 w-4 mb-1" />
                        <span className="text-xs">Carrinho</span>
                      </Link>
                    </div>

                    {store.whatsapp && (
                      <Button 
                        onClick={() => {
                          handleWhatsAppContact();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full text-white"
                        style={{ backgroundColor: store.accent_color }}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Falar no WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PublicStoreHeader;