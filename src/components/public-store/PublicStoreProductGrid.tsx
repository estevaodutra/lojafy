import PublicStoreProductCard from "@/components/PublicStoreProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { usePublicStoreFeaturedProducts, PublicStoreProductData } from "@/hooks/usePublicStoreProducts";

interface PublicStoreProductGridProps {
  resellerId: string;
  storeSlug: string;
}

const PublicStoreProductGrid = ({ resellerId, storeSlug }: PublicStoreProductGridProps) => {
  const { data: featuredProducts = [], isLoading } = usePublicStoreFeaturedProducts(resellerId);

  if (isLoading) {
    return (
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-64 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (featuredProducts.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col gap-4 mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Destaques 🔥
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl sm:mx-0 mx-auto">
                Os melhores produtos com preços exclusivos
              </p>
            </div>
            {/* Botão "Ver todos os produtos" - Desktop */}
            <div className="hidden sm:flex flex-shrink-0">
              <Link to={`/loja/${storeSlug}/produtos`}>
                <Button variant="default" size="lg" className="gap-2 shadow-md">
                  Ver todos os produtos
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
          {/* Botão "Ver todos os produtos" - Mobile */}
          <div className="flex sm:hidden justify-center">
            <Link to={`/loja/${storeSlug}/produtos`} className="w-full max-w-md">
              <Button variant="default" size="lg" className="gap-2 shadow-md w-full">
                Ver todos os produtos
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {featuredProducts
            .filter(rp => rp.product && rp.product.id && rp.product.name && rp.product.active === true)
            .map((resellerProduct: PublicStoreProductData) => {
            const product = resellerProduct.product;
            const displayPrice = resellerProduct.custom_price || product.price;
            
            return (
            <PublicStoreProductCard
              key={resellerProduct.id}
              product={{
                ...product,
                price: displayPrice
              }}
              storeSlug={storeSlug}
            />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default PublicStoreProductGrid;