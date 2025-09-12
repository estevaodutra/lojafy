import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFavorites } from '@/contexts/FavoritesContext';
import { useToast } from '@/hooks/use-toast';
import { Heart, ShoppingCart, Eye, Trash2, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';

const Favorites = () => {
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = (productName: string) => {
    toast({
      title: "Produto adicionado ao carrinho!",
      description: `${productName} foi adicionado ao seu carrinho.`,
    });
  };

  const handleRemoveFromFavorites = (productId: string, productName: string) => {
    removeFromFavorites(productId);
    toast({
      title: "Produto removido dos favoritos",
      description: `${productName} foi removido da sua lista de favoritos.`,
    });
  };

  const handleClearFavorites = () => {
    clearFavorites();
    toast({
      title: "Lista de favoritos limpa",
      description: "Todos os produtos foram removidos dos seus favoritos.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Favoritos</h1>
          <p className="text-muted-foreground mt-2">
            {favorites.length} {favorites.length === 1 ? 'produto favoritado' : 'produtos favoritados'}
          </p>
        </div>
        {favorites.length > 0 && (
          <Button variant="outline" onClick={handleClearFavorites}>
            <Trash2 className="h-4 w-4 mr-2" />
            Limpar Favoritos
          </Button>
        )}
      </div>

      {favorites.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((product) => (
            <Card key={product.id} className="group hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <div className="aspect-square relative overflow-hidden rounded-t-lg">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.badge && (
                    <Badge className="absolute top-2 left-2" variant="secondary">
                      {product.badge}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2 text-red-500 hover:text-red-600 hover:bg-white/90"
                    onClick={() => handleRemoveFromFavorites(product.id, product.name)}
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </Button>
                </div>
                
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg leading-tight line-clamp-2">
                      {product.name}
                    </h3>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {product.inStock ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Em estoque
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-red-600 border-red-600">
                        Fora de estoque
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-primary">
                        {formatPrice(product.price)}
                      </span>
                      {product.originalPrice && product.originalPrice > product.price && (
                        <>
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                          <Badge variant="destructive" className="text-xs">
                            {Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => handleAddToCart(product.name)}
                      disabled={!product.inStock}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Adicionar
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/produto/${product.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Sua lista de favoritos está vazia</h3>
            <p className="text-muted-foreground mb-6">
              Explore nossos produtos e adicione seus favoritos aqui
            </p>
            <Button asChild>
              <Link to="/">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Explorar Produtos
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Favorites;