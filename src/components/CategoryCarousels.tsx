import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from "@/components/ui/carousel";
import ProductCard from "./ProductCard";

const CategoryCarousels = () => {
  // Fetch homepage categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['homepage-categories-with-count'],
    queryFn: async () => {
      const { data: homepageData, error: homepageError } = await supabase
        .from('homepage_categories')
        .select(`
          id,
          category_id,
          position,
          active,
          custom_title,
          custom_description,
          custom_icon,
          custom_color,
          custom_image_url
        `)
        .eq('active', true)
        .order('position');
      
      if (homepageError) throw homepageError;
      
      // Get category details for each homepage category
      const categoriesWithData = await Promise.all(
        homepageData.map(async (homepageCategory) => {
          const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select(`
              id,
              name,
              slug,
              icon,
              color,
              active
            `)
            .eq('id', homepageCategory.category_id)
            .eq('active', true)
            .single();
          
          if (categoryError || !categoryData) return null;
          
          return {
            id: categoryData.id,
            name: homepageCategory.custom_title || categoryData.name,
            slug: categoryData.slug,
            icon: homepageCategory.custom_icon || categoryData.icon,
            color: homepageCategory.custom_color || categoryData.color,
            position: homepageCategory.position
          };
        })
      );
      
      return categoriesWithData.filter(Boolean);
    },
  });

  // Fetch products for each category
  const { data: categoryProducts = {} } = useQuery({
    queryKey: ['category-products', categories.map(c => c?.id)],
    queryFn: async () => {
      if (!categories.length) return {};
      
      const productsMap: Record<string, any[]> = {};
      
      await Promise.all(
        categories.map(async (category) => {
          if (!category) return;
          
          const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id)
            .eq('active', true)
            .order('created_at', { ascending: false })
            .limit(8);
          
          if (error) throw error;
          productsMap[category.id] = products || [];
        })
      );
      
      return productsMap;
    },
    enabled: categories.length > 0,
  });

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="space-y-12">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-80 bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!categories.length) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma categoria em destaque configurada.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="space-y-16">
          {categories.map((category) => {
            if (!category) return null;
            
            const products = categoryProducts[category.id] || [];
            
            if (products.length < 5) return null;

            return (
              <div key={category.id} className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                        {category.name}
                      </h2>
                      <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">
                        Descubra os melhores produtos desta categoria
                      </p>
                    </div>
                    {/* Botão compacto no mobile, ao lado do título */}
                    <Link to={`/categorias/${category.slug}`} className="flex-shrink-0 sm:hidden">
                      <Button 
                        variant="default" 
                        size="sm"
                        className="gap-1"
                      >
                        Ver todos
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                  {/* Botão grande em desktop */}
                  <div className="hidden sm:flex justify-end">
                    <Link to={`/categorias/${category.slug}`}>
                      <Button 
                        variant="default" 
                        size="lg"
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
                      >
                        <span className="flex items-center gap-2">
                          Ver todos os produtos
                          <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                            {products.length}+
                          </span>
                        </span>
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="overflow-hidden max-w-full">
                  <Carousel
                    opts={{
                      align: "start",
                      loop: false,
                    }}
                    className="w-full"
                  >
                    <CarouselContent className="-ml-2 md:-ml-4">
                      {products.filter(p => p.active === true).map((product) => (
                        <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 min-w-0">
                          <ProductCard product={product} />
                        </CarouselItem>
                      ))}
                      {/* Card CTA no final do carousel */}
                      <CarouselItem className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 min-w-0">
                        <Link to={`/categorias/${category.slug}`}>
                          <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all cursor-pointer group">
                            <div className="text-center p-6 space-y-4">
                              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ChevronRight className="h-8 w-8 text-primary" />
                              </div>
                              <h3 className="text-xl font-bold text-foreground">
                                Ver mais produtos
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                Explore toda a categoria {category.name}
                              </p>
                              <Button 
                                variant="default" 
                                className="mt-4"
                              >
                                Ver todos
                              </Button>
                            </div>
                          </div>
                        </Link>
                      </CarouselItem>
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex left-2" />
                    <CarouselNext className="hidden md:flex right-2" />
                  </Carousel>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryCarousels;