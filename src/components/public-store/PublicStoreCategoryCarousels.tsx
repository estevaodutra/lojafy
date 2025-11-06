import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import PublicStoreProductCard from "@/components/PublicStoreProductCard";
import { ArrowRight } from "lucide-react";
import { usePublicStoreCategories, PublicStoreProductData } from "@/hooks/usePublicStoreProducts";

interface PublicStoreCategoryCarouselsProps {
  resellerId: string;
  storeSlug: string;
}

const PublicStoreCategoryCarousels = ({ resellerId, storeSlug }: PublicStoreCategoryCarouselsProps) => {
  const { data: categories = [], isLoading } = usePublicStoreCategories(resellerId);

  if (isLoading) {
    return (
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="space-y-12">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-8">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-10 w-24" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <Skeleton key={j} className="h-80 w-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="space-y-16">
          {categories.map((category: any) => (
            <div key={category.id}>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                    {category.name}
                  </h3>
                  <p className="text-muted-foreground">
                    {category.products.length} produtos disponíveis
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link to={`/loja/${storeSlug}/categoria/${category.slug}`}>
                    Ver todos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>

              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent className="-ml-2 md:-ml-4">
                  {category.products
                    .filter((rp: PublicStoreProductData) => rp.product && rp.product.id && rp.product.name && rp.product.active === true)
                    .map((resellerProduct: PublicStoreProductData) => {
                    const product = resellerProduct.product;
                    const displayPrice = resellerProduct.custom_price || product.price;
                    
                    return (
                      <CarouselItem key={resellerProduct.id} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4 min-w-0">
                        <PublicStoreProductCard
                          product={{
                            ...product,
                            price: displayPrice
                          }}
                          storeSlug={storeSlug}
                        />
                      </CarouselItem>
                    );
                  })}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex left-2" />
                <CarouselNext className="hidden md:flex right-2" />
              </Carousel>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PublicStoreCategoryCarousels;