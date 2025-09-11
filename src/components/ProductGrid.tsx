import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Star } from "lucide-react";

import phoneImg from "@/assets/product-phone.jpg";
import headphonesImg from "@/assets/product-headphones.jpg";
import watchImg from "@/assets/product-watch.jpg";
import laptopImg from "@/assets/product-laptop.jpg";

const products = [
  {
    id: 1,
    name: "iPhone 15 Pro Max",
    price: 8999,
    originalPrice: 9999,
    image: phoneImg,
    rating: 4.8,
    reviews: 234,
    badge: "Novo",
    badgeType: "success" as const,
  },
  {
    id: 2,
    name: "Fone Bluetooth Premium",
    price: 299,
    originalPrice: 399,
    image: headphonesImg,
    rating: 4.6,
    reviews: 189,
    badge: "Promoção",
    badgeType: "destructive" as const,
  },
  {
    id: 3,
    name: "Smartwatch Series 9",
    price: 1299,
    originalPrice: 1599,
    image: watchImg,
    rating: 4.7,
    reviews: 156,
    badge: "Mais Vendido",
    badgeType: "default" as const,
  },
  {
    id: 4,
    name: "MacBook Pro M3",
    price: 12999,
    originalPrice: 14999,
    image: laptopImg,
    rating: 4.9,
    reviews: 89,
    badge: "Oferta",
    badgeType: "warning" as const,
  },
];

const ProductGrid = () => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

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
          {products.map((product) => (
            <Card 
              key={product.id} 
              className="group hover:shadow-card-hover transition-all duration-300 border-border overflow-hidden"
            >
              <CardContent className="p-0">
                <Link to={`/produto/${product.id}`}>
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Badge 
                      variant={product.badgeType}
                      className="absolute top-3 left-3"
                    >
                      {product.badge}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white"
                    >
                      <Heart className="h-4 w-4" />
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
                              i < Math.floor(product.rating) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        ({product.reviews})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-foreground">
                          {formatPrice(product.price)}
                        </span>
                        {product.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(product.originalPrice)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        ou 10x de {formatPrice(product.price / 10)}
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="p-4 pt-0">
                  <Button className="w-full">
                    Comprar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;