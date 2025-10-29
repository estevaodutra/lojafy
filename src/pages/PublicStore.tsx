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
import PublicStoreBannerCarousel from "@/components/public-store/PublicStoreBannerCarousel";
import PublicStoreFeaturedBanners from "@/components/public-store/PublicStoreFeaturedBanners";
import { useResellerBanners } from "@/hooks/useResellerBanners";

const PublicStore = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, isLoading, error } = usePublicStore(slug);
  
  const { banners: carouselBanners } = useResellerBanners(store?.reseller_id, 'carousel');
  const { banners: featuredBanners } = useResellerBanners(store?.reseller_id, 'featured');

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

  // Check if store owner has premium subscription
  if ((store as any).subscription_plan === 'free') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Loja Não Disponível</h1>
          <p className="text-muted-foreground">
            Esta loja está no plano Free e não está disponível publicamente.
            O proprietário precisa fazer upgrade para o plano Premium.
          </p>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Se você é o proprietário desta loja, faça upgrade para Premium e desbloqueie:
            </p>
            <ul className="text-sm text-left mt-2 space-y-1">
              <li>✅ Loja pública visível</li>
              <li>✅ Vendas ilimitadas</li>
              <li>✅ Domínio personalizado</li>
            </ul>
          </div>
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
        {carouselBanners.length > 0 ? (
          <PublicStoreBannerCarousel banners={carouselBanners} />
        ) : (
          <PublicStoreHero store={store} />
        )}
        <PublicStoreProductGrid resellerId={store.reseller_id} storeSlug={store.store_slug} />
        {featuredBanners.length > 0 && (
          <PublicStoreFeaturedBanners banners={featuredBanners} />
        )}
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