import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import heroBanner from "@/assets/hero-banner.jpg";

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  button_text?: string;
  button_link?: string;
  position: number;
  active: boolean;
}

const Hero = () => {
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data as Banner[];
    }
  });

  // Fallback to default banner if no banners are configured
  const defaultBanner = {
    id: 'default',
    title: 'Ofertas da',
    subtitle: 'Semana',
    description: 'Descontos imperdíveis em produtos selecionados',
    image_url: heroBanner,
    button_text: 'Comprar Agora',
    button_link: '/promocoes',
    position: 1,
    active: true
  };

  const displayBanners = banners.length > 0 ? banners : [defaultBanner];

  if (isLoading) {
    return (
      <section className="relative bg-hero-gradient text-white overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-white/80">Carregando...</p>
          </div>
        </div>
      </section>
    );
  }

  if (displayBanners.length === 1) {
    const banner = displayBanners[0];
    return (
      <section className="relative bg-hero-gradient text-white overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                {banner.title}
                {banner.subtitle && (
                  <>
                    <br />
                    <span className="text-yellow-300">{banner.subtitle}</span>
                  </>
                )}
              </h1>
              {banner.description && (
                <p className="text-xl md:text-2xl text-blue-100">
                  {banner.description}
                </p>
              )}
              {banner.id === 'default' && (
                <p className="text-lg text-blue-200">
                  Até <strong className="text-yellow-300">70% OFF</strong> em eletrônicos, moda e casa
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-4">
                {banner.button_text && banner.button_link && (
                  <Link to={banner.button_link}>
                    <Button 
                      size="lg"
                      className="bg-white text-primary hover:bg-gray-100 font-semibold text-lg px-8 py-4"
                    >
                      {banner.button_text}
                    </Button>
                  </Link>
                )}
                <Link to="/promocoes">
                  <Button 
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white hover:text-primary font-semibold text-lg px-8 py-4"
                  >
                    Ver Ofertas
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-36 translate-x-36"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-48 -translate-x-48"></div>
      </section>
    );
  }

  return (
    <section className="relative bg-hero-gradient text-white overflow-hidden">
      <Carousel 
        className="w-full"
        plugins={[
          Autoplay({
            delay: 5000,
          }),
        ]}
      >
        <CarouselContent>
          {displayBanners.map((banner) => (
            <CarouselItem key={banner.id}>
              <div className="container mx-auto px-4 py-20">
                <div className="grid md:grid-cols-2 gap-12 items-center">
                  <div className="space-y-6">
                    <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                      {banner.title}
                      {banner.subtitle && (
                        <>
                          <br />
                          <span className="text-yellow-300">{banner.subtitle}</span>
                        </>
                      )}
                    </h1>
                    {banner.description && (
                      <p className="text-xl md:text-2xl text-blue-100">
                        {banner.description}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row gap-4">
                      {banner.button_text && banner.button_link && (
                        <Link to={banner.button_link}>
                          <Button 
                            size="lg"
                            className="bg-white text-primary hover:bg-gray-100 font-semibold text-lg px-8 py-4"
                          >
                            {banner.button_text}
                          </Button>
                        </Link>
                      )}
                      <Link to="/promocoes">
                        <Button 
                          variant="outline"
                          size="lg"
                          className="border-white text-white hover:bg-white hover:text-primary font-semibold text-lg px-8 py-4"
                        >
                          Ver Ofertas
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-auto rounded-2xl shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        
        {displayBanners.length > 1 && (
          <>
            <CarouselPrevious className="left-4 bg-white/10 border-white/20 text-white hover:bg-white/20" />
            <CarouselNext className="right-4 bg-white/10 border-white/20 text-white hover:bg-white/20" />
          </>
        )}
      </Carousel>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-36 translate-x-36"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-48 -translate-x-48"></div>
    </section>
  );
};

export default Hero;