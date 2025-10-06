import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface Banner {
  id: string;
  image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  open_new_tab: boolean;
  position: number;
  active: boolean;
}

const FeaturedBanners = () => {
  const { data: banners = [] } = useQuery({
    queryKey: ['featured-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .eq('banner_type', 'featured')
        .order('position', { ascending: true })
        .limit(6);
      
      if (error) throw error;
      return data as Banner[];
    }
  });

  if (banners.length === 0) return null;

  const BannerImage = ({ banner }: { banner: Banner }) => (
    <div className="group relative overflow-hidden rounded-lg aspect-[2/1] bg-muted transition-transform hover:scale-105">
      <picture>
        {banner.mobile_image_url && (
          <source 
            media="(max-width: 768px)" 
            srcSet={banner.mobile_image_url} 
          />
        )}
        <img
          src={banner.image_url}
          alt="Banner destaque"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </picture>
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
    </div>
  );

  return (
    <section className="py-12 bg-secondary/30">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">Destaques</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {banners.map((banner) => (
            <div key={banner.id}>
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
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedBanners;