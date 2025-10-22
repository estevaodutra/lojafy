import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ResellerBanner, useResellerBanners } from '@/hooks/useResellerBanners';
import { ResellerBannerUpload } from './ResellerBannerUpload';

interface ResellerBannerFormProps {
  isOpen: boolean;
  onClose: () => void;
  banner?: ResellerBanner | null;
  resellerId: string;
  bannerType: 'carousel' | 'featured';
  existingBanners: ResellerBanner[];
}

const ResellerBannerForm: React.FC<ResellerBannerFormProps> = ({
  isOpen,
  onClose,
  banner,
  resellerId,
  bannerType,
  existingBanners,
}) => {
  const { createBanner, updateBanner } = useResellerBanners(resellerId, bannerType);
  
  const [formData, setFormData] = useState({
    desktop_image_url: '',
    mobile_image_url: '',
    active: true,
  });

  const maxBanners = bannerType === 'carousel' ? 5 : 6;

  useEffect(() => {
    if (banner) {
      setFormData({
        desktop_image_url: banner.desktop_image_url,
        mobile_image_url: banner.mobile_image_url || '',
        active: banner.active,
      });
    } else {
      setFormData({
        desktop_image_url: '',
        mobile_image_url: '',
        active: true,
      });
    }
  }, [banner, isOpen]);

  const getNextAvailablePosition = () => {
    const activeBanners = existingBanners.filter(b => b.active && b.banner_type === bannerType);
    return activeBanners.length + 1;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.desktop_image_url) {
      return;
    }

    const dataToSubmit = {
      reseller_id: resellerId,
      banner_type: bannerType,
      ...formData,
      link_url: null,
      open_new_tab: false,
      position: banner?.position || getNextAvailablePosition(),
    };

    if (banner) {
      updateBanner.mutate({ id: banner.id, data: dataToSubmit });
    } else {
      createBanner.mutate(dataToSubmit);
    }
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {banner ? 'Editar Banner' : `Novo Banner ${bannerType === 'carousel' ? 'Rotativo' : 'de Destaque'}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <ResellerBannerUpload
            bannerType={bannerType}
            onDesktopImageUploaded={(url) => setFormData(prev => ({ ...prev, desktop_image_url: url }))}
            onMobileImageUploaded={(url) => setFormData(prev => ({ ...prev, mobile_image_url: url }))}
            currentDesktopImage={formData.desktop_image_url}
            currentMobileImage={formData.mobile_image_url}
          />

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Switch
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
            />
            <Label htmlFor="active">Banner Ativo</Label>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createBanner.isPending || updateBanner.isPending || !formData.desktop_image_url}
            >
              {createBanner.isPending || updateBanner.isPending 
                ? 'Salvando...' 
                : banner ? 'Atualizar' : 'Criar'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResellerBannerForm;