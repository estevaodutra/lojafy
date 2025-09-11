import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronRight, Clock, Star, Heart, Zap } from "lucide-react";
import { promotionalProducts } from "@/data/mockData";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";

const Promocoes = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 23,
    minutes: 45,
    seconds: 32
  });
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const calculateDiscount = (original: number, current: number) => {
    return Math.round(((original - current) / original) * 100);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Início</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Promoções</span>
        </nav>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-red-500 to-pink-600 rounded-xl p-8 text-white mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="mb-6 md:mb-0">
              <h1 className="text-4xl font-bold mb-2">
                <Zap className="inline h-8 w-8 mr-2" />
                Super Ofertas
              </h1>
              <p className="text-xl opacity-90">Descontos imperdíveis por tempo limitado!</p>
            </div>
            
            {/* Countdown Timer */}
            <div className="bg-white/20 rounded-lg p-6 backdrop-blur-sm">
              <div className="text-center mb-2">
                <Clock className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Termina em:</p>
              </div>
              <div className="flex gap-4 text-center">
                <div className="bg-white/30 rounded-lg p-3 min-w-[60px]">
                  <div className="text-2xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
                  <div className="text-xs">HRS</div>
                </div>
                <div className="bg-white/30 rounded-lg p-3 min-w-[60px]">
                  <div className="text-2xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
                  <div className="text-xs">MIN</div>
                </div>
                <div className="bg-white/30 rounded-lg p-3 min-w-[60px]">
                  <div className="text-2xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
                  <div className="text-xs">SEG</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Offer of the Day */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Oferta do Dia</h2>
          </div>

          {promotionalProducts.slice(0, 1).map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-2 gap-0">
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-80 object-cover"
                    />
                    <Badge className="absolute top-4 left-4 bg-red-500 text-white">
                      -{calculateDiscount(product.originalPrice!, product.price)}% OFF
                    </Badge>
                  </div>
                  
                  <div className="p-8 flex flex-col justify-center">
                    <h3 className="text-2xl font-bold mb-4">{product.name}</h3>
                    <p className="text-muted-foreground mb-6">{product.description}</p>
                    
                    <div className="space-y-2 mb-6">
                      <p className="text-2xl text-muted-foreground line-through">
                        De: {formatPrice(product.originalPrice!)}
                      </p>
                      <p className="text-4xl font-bold text-red-500">
                        Por: {formatPrice(product.price)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ou 12x de {formatPrice(product.price / 12)} sem juros
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Link to={`/produto/${product.id}`} className="flex-1">
                        <Button size="lg" className="w-full">
                          Comprar Agora
                        </Button>
                      </Link>
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={() => {
                          if (isFavorite(product.id)) {
                            removeFromFavorites(product.id);
                            toast({
                              title: "Removido dos favoritos",
                              description: `${product.name} foi removido dos seus favoritos.`,
                            });
                          } else {
                            addToFavorites(product);
                            toast({
                              title: "Adicionado aos favoritos",
                              description: `${product.name} foi adicionado aos seus favoritos.`,
                            });
                          }
                        }}
                      >
                        <Heart className={`h-5 w-5 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Separator className="my-12" />

        {/* Flash Sale */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-r from-purple-500 to-blue-600 p-2 rounded-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold">Promoção Relâmpago</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {promotionalProducts.map((product) => (
              <Card key={product.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <Link to={`/produto/${product.id}`}>
                    <div className="relative mb-4">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-md"
                      />
                      <Badge className="absolute top-2 left-2 bg-red-500 text-white">
                        -{calculateDiscount(product.originalPrice!, product.price)}% OFF
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-background"
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
                            addToFavorites(product);
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

                    <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>

                    <div className="flex items-center mb-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < Math.floor(product.rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">
                        ({product.rating})
                      </span>
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground line-through">
                        {formatPrice(product.originalPrice!)}
                      </p>
                      <p className="text-xl font-bold text-red-500">
                        {formatPrice(product.price)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ou 12x de {formatPrice(product.price / 12)} sem juros
                      </p>
                    </div>
                  </Link>

                  <Link to={`/produto/${product.id}`}>
                    <Button className="w-full mt-4">
                      Comprar
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Benefits Banner */}
        <div className="bg-gradient-to-r from-green-500 to-blue-600 rounded-xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">Por que comprar conosco?</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                🚚
              </div>
              <h4 className="font-semibold mb-2">Frete Grátis</h4>
              <p className="text-sm opacity-90">Acima de R$ 199</p>
            </div>
            <div>
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                🔒
              </div>
              <h4 className="font-semibold mb-2">Pagamento Seguro</h4>
              <p className="text-sm opacity-90">Seus dados protegidos</p>
            </div>
            <div>
              <div className="bg-white/20 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                ↩️
              </div>
              <h4 className="font-semibold mb-2">Troca Garantida</h4>
              <p className="text-sm opacity-90">Até 30 dias</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Promocoes;