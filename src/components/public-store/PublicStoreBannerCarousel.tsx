import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Autoplay from 'embla-carousel-autoplay';
import { Link } from 'react-router-dom';
import { ResellerBanner } from '@/hooks/useResellerBanners';

interface PublicStoreBannerCarouselProps {
  banners: ResellerBanner[];
}

const PublicStoreBannerCarousel = ({ banners }: PublicStoreBannerCarouselProps) => {
  if (banners.length === 0) return null;

  const BannerImage = ({ banner }: { banner: ResellerBanner }) => (
    <div className="w-full h-[50vh] md:h-[60vh] lg:h-[70vh] relative overflow-hidden">
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
      <section className="relative overflow-hidden">
        {banner.link_url ? (
          banner.open_new_tab ? (
            <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
              <BannerImage banner={banner} />
            </a>
          ) : (
            <Link to={banner.link_url}>
              <BannerImage banner={banner} />
            </Link>
          )
        ) : (
          <BannerImage banner={banner} />
        )}
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden">
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
              {banner.link_url ? (
                banner.open_new_tab ? (
                  <a href={banner.link_url} target="_blank" rel="noopener noreferrer">
                    <BannerImage banner={banner} />
                  </a>
                ) : (
                  <Link to={banner.link_url}>
                    <BannerImage banner={banner} />
                  </Link>
                )
              ) : (
                <BannerImage banner={banner} />
              )}
            </CarouselItem>
          ))}
        </CarouselContent>
        
        <CarouselPrevious className="left-4 bg-white/10 border-white/20 text-white hover:bg-white/20" />
        <CarouselNext className="right-4 bg-white/10 border-white/20 text-white hover:bg-white/20" />
      </Carousel>
    </section>
  );
};

export default PublicStoreBannerCarousel;