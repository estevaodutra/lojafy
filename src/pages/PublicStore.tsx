import { useParams } from "react-router-dom";
import { usePublicStore } from "@/hooks/usePublicStore";
import { Skeleton } from "@/components/ui/skeleton";
import Benefits from "@/components/Benefits";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import { PublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreHero from "@/components/public-store/PublicStoreHero";
import PublicStoreProductGrid from "@/components/public-store/PublicStoreProductGrid";
import PublicStoreCategoryCarousels from "@/components/public-store/PublicStoreCategoryCarousels";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";

const PublicStore = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, isLoading, error } = usePublicStore(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="h-16 bg-muted" />
          <div className="container mx-auto px-4 py-8">
            <div className="space-y-6">
              <Skeleton className="h-8 w-64" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-80 w-full" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Loja não encontrada
          </h1>
          <p className="text-muted-foreground mb-6">
            A loja que você está procurando não existe ou não está ativa.
          </p>
          <a 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Voltar ao início
          </a>
        </div>
      </div>
    );
  }

  return (
    <PublicStoreContext.Provider value={{ store }}>
      <div 
        className="min-h-screen"
        style={{
          '--primary': store.primary_color || '#000000',
          '--secondary': store.secondary_color || '#f3f4f6',
          '--accent': store.accent_color || '#3b82f6',
        } as React.CSSProperties}
      >
        <PublicStoreHeader store={store} />
        <PublicStoreHero store={store} />
        <PublicStoreProductGrid resellerId={store.reseller_id} storeSlug={store.store_slug} />
        <PublicStoreCategoryCarousels resellerId={store.reseller_id} storeSlug={store.store_slug} />
        <Benefits />
        <Testimonials />
        <Newsletter />
        <PublicStoreFooter store={store} />
      </div>
    </PublicStoreContext.Provider>
  );
};

export default PublicStore;