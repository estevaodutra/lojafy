import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';

interface FooterBannerData {
  id: string;
  title?: string;
  image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  open_new_tab: boolean;
  position: number;
  active: boolean;
}

interface FooterBannerProps {
  resellerId?: string;
}

const BannerLinkWrapper = ({ linkUrl, openNewTab, children }: { linkUrl?: string; openNewTab?: boolean; children: React.ReactNode }) => {
  if (!linkUrl) return <>{children}</>;
  
  const isExternal = linkUrl.startsWith('http://') || linkUrl.startsWith('https://') || linkUrl.startsWith('//');
  
  if (openNewTab || isExternal) {
    return (
      <a 
        href={linkUrl} 
        target={openNewTab ? "_blank" : undefined} 
        rel={openNewTab ? "noopener noreferrer" : undefined}
        className="block cursor-pointer w-full"
      >
        {children}
      </a>
    );
  }
  
  return (
    <Link to={linkUrl} className="block cursor-pointer w-full">
      {children}
    </Link>
  );
};

export const FooterBanner = ({ resellerId }: FooterBannerProps) => {
  const { data: banners = [] } = useQuery({
    queryKey: ['footer-banners', resellerId],
    queryFn: async () => {
      if (resellerId) {
        const { data, error } = await supabase
          .from('reseller_banners')
          .select('*')
          .eq('reseller_id', resellerId)
          .eq('active', true)
          .eq('banner_type', 'footer')
          .order('position', { ascending: true });
          
        if (error) throw error;
        return (data || []).map((b: any) => ({
          id: b.id,
          image_url: b.desktop_image_url,
          mobile_image_url: b.mobile_image_url,
          link_url: b.link_url,
          open_new_tab: b.open_new_tab || false,
          position: b.position || 1,
          active: b.active
        })) as FooterBannerData[];
      }

      const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('active', true)
        .eq('banner_type', 'footer')
        .order('position', { ascending: true });

      if (error) throw error;
      return (data || []) as FooterBannerData[];
    }
  });

  if (banners.length === 0) return null;

  return (
    <section className="py-8 bg-background">
      <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-7xl space-y-6">
        {banners.map((banner) => (
          <BannerLinkWrapper key={banner.id} linkUrl={banner.link_url} openNewTab={banner.open_new_tab}>
            <div className="w-full md:aspect-[8/3] rounded-lg overflow-hidden bg-muted hover:opacity-95 transition-opacity shadow-md">
              <picture>
                {banner.mobile_image_url && (
                  <source 
                    media="(max-width: 768px)" 
                    srcSet={banner.mobile_image_url} 
                  />
                )}
                <img
                  src={banner.image_url}
                  alt={banner.title || "Banner do Rodapé"}
                  className="w-full h-auto md:h-full md:object-cover"
                />
              </picture>
            </div>
          </BannerLinkWrapper>
        ))}
      </div>
    </section>
  );
};

export default FooterBanner;
