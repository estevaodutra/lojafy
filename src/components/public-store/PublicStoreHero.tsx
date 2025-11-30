import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { PublicStoreData } from "@/hooks/usePublicStore";
import { MessageCircle } from "lucide-react";

interface PublicStoreHeroProps {
  store: PublicStoreData;
}

const PublicStoreHero = ({ store }: PublicStoreHeroProps) => {
  const handleWhatsAppContact = () => {
    if (store.whatsapp) {
      const message = encodeURIComponent(`Olá! Vi sua loja online e gostaria de mais informações.`);
      window.open(`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  // If there's a banner image, show it as hero
  if (store.banner_image_url) {
    const isImageOnly = !store.banner_title && !store.banner_subtitle;
    
    if (isImageOnly) {
      return (
        <section className="relative overflow-hidden py-4">
          <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
            <div className="w-full aspect-[2/1] rounded-lg overflow-hidden bg-muted">
              <img
                src={store.banner_image_url}
                alt="Banner da loja"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="relative overflow-hidden py-4">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <div className="relative aspect-[2/1] rounded-lg overflow-hidden bg-muted">
            <img
              src={store.banner_image_url}
              alt="Banner da loja"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="container mx-auto px-4 text-center text-white">
                {store.banner_title && (
                  <h1 className="text-4xl md:text-6xl font-bold mb-4">
                    {store.banner_title}
                  </h1>
                )}
                {store.banner_subtitle && (
                  <p className="text-xl md:text-2xl mb-6">
                    {store.banner_subtitle}
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {store.whatsapp && (
                    <Button 
                      onClick={handleWhatsAppContact}
                      size="lg"
                      className="bg-white text-primary hover:bg-gray-100 font-semibold text-lg px-8 py-4"
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Falar Conosco
                    </Button>
                  )}
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white hover:text-primary font-semibold text-lg px-8 py-4"
                    asChild
                  >
                    <Link to="#produtos">Ver Produtos</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Default hero without banner image
  return (
    <section 
      className="relative text-white overflow-hidden py-20"
      style={{
        background: `linear-gradient(135deg, ${store.primary_color || '#000000'}, ${store.accent_color || '#3b82f6'})`
      }}
    >
      <div className="container mx-auto px-4">
        <div className="text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            {store.banner_title || `Bem-vindos à ${store.store_name}`}
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            {store.banner_subtitle || 'Os melhores produtos com preços especiais'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {store.whatsapp && (
              <Button 
                onClick={handleWhatsAppContact}
                size="lg"
                className="bg-white text-primary hover:bg-gray-100 font-semibold text-lg px-8 py-4"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                Falar Conosco
              </Button>
            )}
            <Button 
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary font-semibold text-lg px-8 py-4"
              asChild
            >
              <Link to="#produtos">Ver Produtos</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 md:w-72 md:h-72 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-16 translate-x-16 md:-translate-y-36 md:translate-x-36"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 md:w-96 md:h-96 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-24 -translate-x-24 md:translate-y-48 md:-translate-x-48"></div>
    </section>
  );
};

export default PublicStoreHero;