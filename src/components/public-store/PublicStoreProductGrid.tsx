import PublicStoreProductCard from "@/components/PublicStoreProductCard";
import { Skeleton } from "@/components/ui/skeleton";
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
        <div className="container mx-auto px-4">
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
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Produtos em Destaque
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Confira nossa seleção especial com os melhores produtos e preços exclusivos
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6 max-w-full">
          {featuredProducts
            .filter(rp => rp.product && rp.product.id && rp.product.name)
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