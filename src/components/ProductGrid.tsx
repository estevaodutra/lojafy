import { Link } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const ProductGrid = () => {
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { toast } = useToast();

  // Fetch featured products from Supabase
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .eq('featured', true)
        .limit(4);
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 1, // 1 minute for featured products
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getBadgeVariant = (badge: string) => {
    switch (badge?.toLowerCase()) {
      case 'novo': return 'default';
      case 'promoção': case 'oferta': return 'destructive';
      case 'mais vendido': case 'popular': return 'secondary';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Produtos em Destaque
            </h2>
            <p className="text-lg text-muted-foreground">
              Os produtos mais procurados com os melhores preços
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-0">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Produtos em Destaque
          </h2>
          <p className="text-lg text-muted-foreground">
            Os produtos mais procurados com os melhores preços
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum produto em destaque encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="group hover:shadow-card-hover transition-all duration-300 border-border overflow-hidden"
              >
                <CardContent className="p-0">
                  <Link to={`/produto/${product.id}`}>
                    <div className="relative">
                      <img
                        src={product.main_image_url || product.image_url || '/placeholder.svg'}
                        alt={product.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {product.badge && (
                        <Badge 
                          variant={getBadgeVariant(product.badge)}
                          className="absolute top-3 left-3"
                        >
                          {product.badge}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-3 right-3 bg-white/80 hover:bg-white"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isFavorite(product.id)) {
                            removeFromFavorites(product.id);
                            toast({
                              title: "Removido dos favoritos",
                              description: `${product.name} foi removido dos seus favoritos.`,
                            });
                          } else {
                            addToFavorites({
                              id: product.id,
                              name: product.name,
                              price: Number(product.price),
                              originalPrice: product.original_price ? Number(product.original_price) : undefined,
                              image: product.main_image_url || product.image_url || '/placeholder.svg',
                              rating: Number(product.rating || 0),
                              badge: product.badge || "",
                              description: product.description || "",
                              specifications: (product.specifications as Record<string, string>) || {},
                              category: product.category_id || "",
                              brand: product.brand || "",
                              inStock: (product.stock_quantity || 0) > 0,
                              images: product.images || [],
                              reviews: [],
                            });
                            toast({
                              title: "Adicionado aos favoritos",
                              description: `${product.name} foi adicionado aos seus favoritos.`,
                            });
                          }
                        }}
                      >
                        <Heart className={`h-4 w-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>

                    <div className="p-4 space-y-3">
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {product.name}
                      </h3>
                      
                      <div className="flex items-center gap-1">
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(Number(product.rating || 0)) 
                                  ? 'fill-yellow-400 text-yellow-400' 
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          ({product.review_count || 0})
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-foreground">
                            {formatPrice(Number(product.price))}
                          </span>
                          {product.original_price && (
                            <span className="text-sm text-muted-foreground line-through">
                              {formatPrice(Number(product.original_price))}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          ou 10x de {formatPrice(Number(product.price) / 10)}
                        </p>
                      </div>
                    </div>
                  </Link>

                  <div className="p-4 pt-0">
                    <Link to={`/produto/${product.id}`}>
                      <Button className="w-full">
                        Comprar
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;