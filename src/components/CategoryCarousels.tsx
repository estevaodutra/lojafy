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
        <div className="container mx-auto px-4">
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
        <div className="container mx-auto px-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma categoria em destaque configurada.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="space-y-16">
          {categories.map((category) => {
            if (!category) return null;
            
            const products = categoryProducts[category.id] || [];
            
            if (products.length === 0) return null;

            return (
              <div key={category.id} className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                      {category.name}
                    </h2>
                    <p className="text-lg text-muted-foreground">
                      Descubra os melhores produtos desta categoria
                    </p>
                  </div>
                  <Link to={`/categorias/${category.slug}`}>
                    <Button variant="outline" className="gap-2">
                      Ver todos
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <Carousel
                  opts={{
                    align: "start",
                    loop: false,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-2 md:-ml-4">
                    {products.map((product) => (
                      <CarouselItem key={product.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                        <ProductCard product={product} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden md:flex" />
                  <CarouselNext className="hidden md:flex" />
                </Carousel>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryCarousels;