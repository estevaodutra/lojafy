import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Heart, Zap } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EmDestaque = () => {
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { toast } = useToast();

  // Fetch featured products
  const { data: featuredProducts = [], isLoading } = useQuery({
    queryKey: ['all-featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .eq('featured', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getBadgeVariant = (badge: string): "default" | "destructive" | "secondary" | "outline" => {
    const lowercaseBadge = badge.toLowerCase();
    if (lowercaseBadge.includes('oferta') || lowercaseBadge.includes('desconto')) return "destructive";
    if (lowercaseBadge.includes('novo') || lowercaseBadge.includes('lançamento')) return "default";
    if (lowercaseBadge.includes('popular') || lowercaseBadge.includes('destaque')) return "secondary";
    return "outline";
  };

  const handleFavoriteToggle = (product: any) => {
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
        price: product.price,
        originalPrice: product.original_price,
        image: product.main_image_url || product.image_url || (product.images?.[0]) || '/placeholder.svg',
        rating: product.rating || 0,
        badge: product.badge,
        description: product.description || '',
        specifications: product.specifications || {},
        category: product.category || '',
        brand: product.brand || '',
        inStock: product.stock_quantity > 0,
        images: product.images || [],
        reviews: []
      });
      toast({
        title: "Adicionado aos favoritos",
        description: `${product.name} foi adicionado aos seus favoritos.`,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/10 to-secondary/10 py-16">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-full mb-6">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">Produtos em Destaque</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Mais Barato que a Shopee 🔥
            </h1>
            <p className="text-xl text-muted-foreground">
              Todos os produtos mais procurados com os melhores preços
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-0">
                    <Skeleton className="h-64 rounded-t-lg" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-6 w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">
                Nenhum produto em destaque no momento.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <p className="text-muted-foreground">
                  Encontramos <span className="font-bold text-primary">{featuredProducts.length} produtos</span> em destaque
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <Card key={product.id} className="group hover:shadow-xl transition-all duration-300 relative">
                    <Link to={`/produto/${product.id}`}>
                      <CardContent className="p-0">
                        {/* Product Image */}
                        <div className="relative aspect-square overflow-hidden rounded-t-lg bg-gray-100">
                          <img
                            src={product.main_image_url || product.image_url || (product.images?.[0]) || '/placeholder.svg'}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          
                          {/* Badge */}
                          {product.badge && (
                            <Badge 
                              variant={getBadgeVariant(product.badge)}
                              className="absolute top-2 left-2"
                            >
                              {product.badge}
                            </Badge>
                          )}
                          
                          {/* Favorite Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleFavoriteToggle(product);
                            }}
                            className="absolute top-2 right-2 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                          >
                            <Heart
                              className={`h-5 w-5 transition-colors ${
                                isFavorite(product.id)
                                  ? 'fill-red-500 text-red-500'
                                  : 'text-muted-foreground hover:text-red-500'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Product Info */}
                        <div className="p-4 space-y-3">
                          {/* Product Name */}
                          <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {product.name}
                          </h3>

                          {/* Rating */}
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(product.rating || 0)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'fill-gray-200 text-gray-200'
                                }`}
                              />
                            ))}
                            <span className="text-sm text-muted-foreground ml-1">
                              ({product.rating || 0})
                            </span>
                          </div>

                          {/* Price */}
                          <div className="space-y-1">
                            {product.original_price && product.original_price > product.price && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground line-through">
                                  {formatPrice(product.original_price)}
                                </span>
                                <Badge variant="destructive" className="text-xs">
                                  -{Math.round(((product.original_price - product.price) / product.original_price) * 100)}%
                                </Badge>
                              </div>
                            )}
                            <p className="text-2xl font-bold text-primary">
                              {formatPrice(product.price)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default EmDestaque;
