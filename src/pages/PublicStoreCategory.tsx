import { useParams } from "react-router-dom";
import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import { usePublicStoreCategories } from "@/hooks/usePublicStoreProducts";
import PublicStoreProductCard from "@/components/PublicStoreProductCard";
import { Skeleton } from "@/components/ui/skeleton";

const PublicStoreCategory = () => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { store } = usePublicStoreContext();
  const { data: categories = [], isLoading } = usePublicStoreCategories(store.reseller_id);
  
  const category = categories.find(cat => cat.slug === categorySlug);

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

  if (!category) {
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
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Categoria não encontrada</h1>
          <p className="text-muted-foreground">A categoria que você está procurando não existe nesta loja.</p>
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
          <h1 className="text-3xl font-bold text-foreground mb-2">{category.name}</h1>
          <p className="text-muted-foreground">
            {category.products.length} produtos encontrados
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {category.products.map((resellerProduct: any) => {
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
      </main>

      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreCategory;