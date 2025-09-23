import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import {
  Heart,
  ShoppingCart,
  Eye,
  Trash2,
  ShoppingBag
} from "lucide-react";

const PublicStoreFavorites = () => {
  const { store } = usePublicStoreContext();
  const { favorites, removeFromFavorites, clearFavorites } = useFavorites();
  const { addItem, setStoreSlug } = useCart();
  const { toast } = useToast();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleAddToCart = (product: any) => {
    // Set store context
    setStoreSlug(store.store_slug);
    
    const cartItem = {
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      price: Number(product.price),
      quantity: 1,
    };
    
    addItem(cartItem);
    toast({
      title: "Produto adicionado ao carrinho!",
      description: product.name,
    });
  };

  const handleRemoveFromFavorites = (productId: string, productName: string) => {
    removeFromFavorites(productId);
    toast({
      title: "Produto removido dos favoritos",
      description: productName,
      variant: "destructive",
    });
  };

  const handleClearFavorites = () => {
    clearFavorites();
    toast({
      title: "Favoritos limpos",
      description: "Todos os produtos foram removidos dos favoritos",
    });
  };

  if (favorites.length === 0) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-16">
          <Heart className="h-24 w-24 mx-auto text-muted-foreground mb-6" />
          <h1 className="text-3xl font-bold mb-4">Seus Favoritos</h1>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Você ainda não adicionou nenhum produto aos seus favoritos. 
            Explore a loja e salve os produtos que mais gosta!
          </p>
          <Button asChild>
            <Link to={`/loja/${store.store_slug}`}>
              <ShoppingBag className="h-5 w-5 mr-2" />
              Explorar Produtos
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Meus Favoritos</h1>
          <p className="text-muted-foreground">
            {favorites.length} {favorites.length === 1 ? 'produto' : 'produtos'} salvos
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleClearFavorites}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar Favoritos
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {favorites.map((product) => (
          <Card key={product.id} className="group hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="relative mb-4">
                <img
                  src={product.image}
                  alt={product.name}
                  className="w-full h-48 object-cover rounded-lg"
                />
                {product.badge && (
                  <Badge className="absolute top-2 left-2">
                    {product.badge}
                  </Badge>
                )}
                {product.originalPrice && (
                  <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground">
                    -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% OFF
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemoveFromFavorites(product.id, product.name)}
                >
                  <Heart className="h-4 w-4 fill-current" />
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium line-clamp-2 text-sm">
                  {product.name}
                </h3>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {product.brand}
                  </span>
                  <Badge variant={product.inStock ? "default" : "secondary"} className="text-xs">
                    {product.inStock ? "Em estoque" : "Esgotado"}
                  </Badge>
                </div>

                <div className="space-y-1">
                  {product.originalPrice && (
                    <p className="text-xs text-muted-foreground line-through">
                      {formatPrice(product.originalPrice)}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(product.price)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ou 12x de {formatPrice(product.price / 12)}
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleAddToCart(product)}
                    disabled={!product.inStock}
                    style={{ backgroundColor: store.accent_color }}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Carrinho
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/loja/${store.store_slug}/produto/${product.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
};

export default PublicStoreFavorites;