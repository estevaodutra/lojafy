import React from 'react';
import { useParams } from 'react-router-dom';
import { usePublicStore } from '@/hooks/usePublicStore';
import { Skeleton } from '@/components/ui/skeleton';
import PublicStoreHeader from '@/components/public-store/PublicStoreHeader';
import PublicStoreHero from '@/components/public-store/PublicStoreHero';
import PublicStoreProductGrid from '@/components/public-store/PublicStoreProductGrid';
import PublicStoreCategoryCarousels from '@/components/public-store/PublicStoreCategoryCarousels';
import PublicStoreFooter from '@/components/public-store/PublicStoreFooter';
import Benefits from '@/components/Benefits';
import Testimonials from '@/components/Testimonials';
import Newsletter from '@/components/Newsletter';

const PublicStore = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, products, isLoading, error } = usePublicStore(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-16 w-full mb-8" />
          <Skeleton className="h-48 w-full mb-8" />
          <div className="space-y-8">
            <Skeleton className="h-8 w-64 mx-auto" />
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-80 w-full" />
              ))}
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
          <h1 className="text-2xl font-bold text-destructive mb-4">
            Loja não encontrada
          </h1>
          <p className="text-muted-foreground">
            A loja que você está procurando não existe ou não está ativa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen"
      style={{
        '--store-primary': store.primary_color || '#000000',
        '--store-secondary': store.secondary_color || '#f3f4f6',
        '--store-accent': store.accent_color || '#3b82f6',
      } as React.CSSProperties}
    >
      <PublicStoreHeader store={store} />
      
      <main>
        <PublicStoreHero store={store} />
        <PublicStoreProductGrid resellerId={store.reseller_id} />
        <PublicStoreCategoryCarousels 
          resellerId={store.reseller_id} 
          storeSlug={store.store_slug} 
        />
        <Benefits />
        <Testimonials />
        <Newsletter />
      </main>
      
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStore;