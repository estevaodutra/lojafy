import React from 'react';
import { useParams } from 'react-router-dom';
import { usePublicStore } from '@/hooks/usePublicStore';
import ProductCard from '@/components/ProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const PublicStore = () => {
  const { slug } = useParams<{ slug: string }>();
  const { store, products, isLoading, error } = usePublicStore(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-48 w-full mb-8" />
          <Skeleton className="h-8 w-64 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-80 w-full" />
            ))}
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

  const handleWhatsAppContact = () => {
    if (store.whatsapp) {
      const message = encodeURIComponent(`Olá! Vi sua loja online e gostaria de mais informações.`);
      window.open(`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        '--store-primary': store.primary_color || '#000000',
        '--store-secondary': store.secondary_color || '#f3f4f6',
        '--store-accent': store.accent_color || '#3b82f6',
      } as React.CSSProperties}
    >
      {/* Header */}
      <header 
        className="border-b" 
        style={{ backgroundColor: store.primary_color }}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {store.logo_url && (
                <img 
                  src={store.logo_url} 
                  alt={store.store_name}
                  className="h-12 w-auto"
                />
              )}
              <h1 
                className="text-2xl font-bold"
                style={{ color: store.primary_color === '#000000' ? '#ffffff' : '#000000' }}
              >
                {store.store_name}
              </h1>
            </div>
            
            {store.whatsapp && (
              <Button 
                onClick={handleWhatsAppContact}
                style={{ backgroundColor: store.accent_color }}
                className="text-white"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Banner */}
      {store.banner_image_url && (
        <div className="relative h-64 md:h-80 overflow-hidden">
          <img 
            src={store.banner_image_url}
            alt="Banner da loja"
            className="w-full h-full object-cover"
          />
          {(store.banner_title || store.banner_subtitle) && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="text-center text-white">
                {store.banner_title && (
                  <h2 className="text-3xl md:text-5xl font-bold mb-2">
                    {store.banner_title}
                  </h2>
                )}
                {store.banner_subtitle && (
                  <p className="text-lg md:text-xl">
                    {store.banner_subtitle}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Nossos Produtos</h2>
          <p className="text-muted-foreground">
            Confira nossa seleção especial com os melhores preços
          </p>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-muted-foreground">
              Esta loja ainda não possui produtos cadastrados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((resellerProduct) => {
              const product = resellerProduct.product;
              const displayPrice = resellerProduct.custom_price || product.price;
              
              return (
                <ProductCard
                  key={resellerProduct.id}
                  product={{
                    ...product,
                    price: displayPrice
                  }}
                />
              );
            })}
          </div>
        )}
      </main>

      {/* Contact Info */}
      {(store.contact_phone || store.contact_email || store.contact_address) && (
        <footer 
          className="border-t py-8"
          style={{ backgroundColor: store.secondary_color }}
        >
          <div className="container mx-auto px-4">
            <h3 className="text-xl font-semibold mb-4">Contato</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {store.contact_phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{store.contact_phone}</span>
                </div>
              )}
              {store.contact_email && (
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{store.contact_email}</span>
                </div>
              )}
              {store.contact_address && (
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{store.contact_address}</span>
                </div>
              )}
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default PublicStore;