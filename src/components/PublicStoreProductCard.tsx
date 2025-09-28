import { Link } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";

interface PublicStoreProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    original_price?: number;
    main_image_url?: string;
    image_url?: string;
    badge?: string;
    rating?: number;
    review_count?: number;
    stock_quantity?: number;
    description?: string;
    specifications?: any;
    category_id?: string;
    brand?: string;
    images?: string[];
    high_rotation?: boolean;
  };
  storeSlug: string;
}

const PublicStoreProductCard = ({ product, storeSlug }: PublicStoreProductCardProps) => {
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { toast } = useToast();

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

  const handleFavoriteClick = (e: React.MouseEvent) => {
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
  };

  return (
    <Card className="group hover:shadow-card-hover transition-all duration-300 border-border overflow-hidden h-full max-w-full">
      <CardContent className="p-0 h-full flex flex-col">
        <Link to={`/loja/${storeSlug}/produto/${product.id}`} className="flex-1 flex flex-col">
          <div className="relative overflow-hidden bg-muted/20 aspect-square">
            <img
              src={product.main_image_url || product.image_url || '/placeholder.svg'}
              alt={product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 p-2"
            />
            {product.badge && (
              <Badge 
                variant={getBadgeVariant(product.badge)}
                className="absolute top-2 left-2 text-xs max-w-[calc(100%-4rem)]"
              >
                {product.badge}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white h-8 w-8 p-0 flex-shrink-0"
              onClick={handleFavoriteClick}
            >
              <Heart className={`h-4 w-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>

          <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 flex-1 flex flex-col min-w-0">
            <h3 className="font-semibold text-sm sm:text-base text-foreground line-clamp-2 break-words flex items-start gap-2 min-w-0">
              <span className="flex-1 min-w-0">{product.name}</span>
              {product.high_rotation && (
                <span 
                  className="text-orange-500 text-sm flex-shrink-0" 
                  title="Produto de Alta Rotatividade - Pode haver atraso no envio devido à alta demanda"
                >
                  ⚠️
                </span>
              )}
            </h3>
            
            <div className="flex items-center gap-1">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i}
                    className={`h-3 w-3 sm:h-4 sm:w-4 ${
                      i < Math.floor(Number(product.rating || 0)) 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">
                ({product.review_count || 0})
              </span>
            </div>

            <div className="space-y-1 mt-auto">
              <div className="flex flex-col gap-1">
                {product.original_price ? (
                  <>
                    <span className="text-xs sm:text-sm text-muted-foreground line-through">
                      De: {formatPrice(Number(product.price))}
                    </span>
                    <span className="text-lg sm:text-xl font-bold text-foreground">
                      Por: {formatPrice(Number(product.original_price))}
                    </span>
                  </>
                ) : (
                  <span className="text-lg sm:text-xl font-bold text-foreground">
                    {formatPrice(Number(product.price))}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                ou 10x de {formatPrice(Number(product.original_price || product.price) / 10)}
              </p>
            </div>
          </div>
        </Link>

        <div className="p-3 sm:p-4 pt-0">
          <Link to={`/loja/${storeSlug}/produto/${product.id}`}>
            <Button className="w-full btn-cart h-10 text-sm">
              Comprar
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default PublicStoreProductCard;