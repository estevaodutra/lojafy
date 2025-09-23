import { useParams, useSearchParams } from "react-router-dom";
import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import { usePublicStoreProducts } from "@/hooks/usePublicStoreProducts";
import PublicStoreProductCard from "@/components/PublicStoreProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useMemo } from "react";

const PublicStoreSearch = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') || '';
  const { store } = usePublicStoreContext();
  const { data: products = [], isLoading } = usePublicStoreProducts(store.reseller_id);

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
      return products.filter(resellerProduct => {
        const product = resellerProduct.product;
        return (
          product.name.toLowerCase().includes(query)
        );
      });
  }, [products, searchQuery]);

  if (isLoading) {
    return (
      <div 
        className="min-h-screen"
        style={{
          '--primary': `hsl(${store.primary_color || '#000000'})`,
          '--secondary': `hsl(${store.secondary_color || '#f3f4f6'})`,
          '--accent': `hsl(${store.accent_color || '#3b82f6'})`,
        } as React.CSSProperties}
      >
        <PublicStoreHeader store={store} />
        <div className="container mx-auto px-4 py-16">
          <Skeleton className="h-8 w-64 mb-8" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
          </div>
        </div>
        <PublicStoreFooter store={store} />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        '--primary': `hsl(${store.primary_color || '#000000'})`,
        '--secondary': `hsl(${store.secondary_color || '#f3f4f6'})`,
        '--accent': `hsl(${store.accent_color || '#3b82f6'})`,
      } as React.CSSProperties}
    >
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Resultados da busca
          </h1>
          <p className="text-muted-foreground">
            {searchQuery ? (
              <>
                {filteredProducts.length} resultado{filteredProducts.length !== 1 ? 's' : ''} para "{searchQuery}"
              </>
            ) : (
              'Digite um termo para buscar produtos'
            )}
          </p>
        </div>

        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((resellerProduct: any) => {
              const product = resellerProduct.product;
              const displayPrice = resellerProduct.custom_price || product.price;
              
              return (
                <PublicStoreProductCard
                  key={resellerProduct.id}
                  product={{
                    ...product,
                    price: displayPrice
                  }}
                  storeSlug={store.store_slug}
                />
              );
            })}
          </div>
        ) : searchQuery ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum produto encontrado
            </h2>
            <p className="text-muted-foreground">
              Tente buscar com outras palavras-chave
            </p>
          </div>
        ) : null}
      </main>

      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreSearch;