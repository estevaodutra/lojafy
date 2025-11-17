import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ProductCard from "./ProductCard";

const ProductGrid = () => {
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

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Mais Barato que a Shopee 🔥
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
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="flex flex-col gap-4 mb-12">
            {/* Desktop: Título centralizado + Botão à direita */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  Mais Barato que a Shopee 🔥
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl sm:mx-0 mx-auto">
                  Os produtos mais procurados com os melhores preços
                </p>
              </div>
              {/* Botão para desktop */}
              <div className="hidden sm:flex flex-shrink-0">
                <Link to="/promocoes">
                  <Button 
                    variant="default" 
                    size="lg"
                    className="gap-2 shadow-md"
                  >
                    Ver todos os produtos
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>
            {/* Botão para mobile - centralizado */}
            <div className="flex sm:hidden justify-center">
              <Link to="/promocoes" className="w-full max-w-md">
                <Button 
                  variant="default" 
                  size="lg"
                  className="gap-2 shadow-md w-full"
                >
                  Ver todos os produtos
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Nenhum produto em destaque encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {products.filter(p => p.active === true).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
  );
};

export default ProductGrid;