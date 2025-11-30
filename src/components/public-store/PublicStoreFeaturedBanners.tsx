import { ResellerBanner } from '@/hooks/useResellerBanners';

interface PublicStoreFeaturedBannersProps {
  banners: ResellerBanner[];
}

const PublicStoreFeaturedBanners = ({ banners }: PublicStoreFeaturedBannersProps) => {
  if (banners.length === 0) return null;

  const BannerImage = ({ banner }: { banner: ResellerBanner }) => (
    <div className="relative overflow-hidden rounded-lg aspect-[2/1] bg-muted">
      <picture>
        {banner.mobile_image_url && (
          <source 
            media="(max-width: 768px)" 
            srcSet={banner.mobile_image_url} 
          />
        )}
        <img
          src={banner.desktop_image_url}
          alt="Banner destaque"
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </picture>
    </div>
  );

  return (
    <section className="py-12 bg-secondary/30">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Destaques</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <BannerImage key={banner.id} banner={banner} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PublicStoreFeaturedBanners;