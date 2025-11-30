import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { ResellerBanner } from '@/hooks/useResellerBanners';

interface PublicStoreBannerCarouselProps {
  banners: ResellerBanner[];
}

const PublicStoreBannerCarousel = ({ banners }: PublicStoreBannerCarouselProps) => {
  if (banners.length === 0) return null;

  const BannerImage = ({ banner }: { banner: ResellerBanner }) => (
    <div className="w-full h-[37vh] md:h-[45vh] lg:h-[52vh] relative overflow-hidden rounded-lg bg-muted">
      <picture>
        {banner.mobile_image_url && (
          <source 
            media="(max-width: 768px)" 
            srcSet={banner.mobile_image_url} 
          />
        )}
        <img
          src={banner.desktop_image_url}
          alt="Banner"
          className="w-full h-full object-cover"
        />
      </picture>
    </div>
  );

  if (banners.length === 1) {
    const banner = banners[0];
    return (
      <section className="relative overflow-hidden py-4 bg-background">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
          <BannerImage banner={banner} />
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden py-4 bg-background">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <Carousel 
          className="w-full"
          plugins={[
            Autoplay({
              delay: 5000,
              stopOnInteraction: true,
            }),
          ]}
        >
          <CarouselContent>
            {banners.map((banner) => (
              <CarouselItem key={banner.id}>
                <BannerImage banner={banner} />
              </CarouselItem>
            ))}
          </CarouselContent>
          
          <CarouselPrevious className="left-4 bg-white/10 border-white/20 text-white hover:bg-white/20" />
          <CarouselNext className="right-4 bg-white/10 border-white/20 text-white hover:bg-white/20" />
        </Carousel>
      </div>
    </section>
  );
};

export default PublicStoreBannerCarousel;