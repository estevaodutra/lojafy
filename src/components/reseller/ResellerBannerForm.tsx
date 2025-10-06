import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    link_url: '',
    open_new_tab: false,
    position: 1,
    active: true,
  });

  const maxBanners = bannerType === 'carousel' ? 5 : 6;

  useEffect(() => {
    if (banner) {
      setFormData({
        desktop_image_url: banner.desktop_image_url,
        mobile_image_url: banner.mobile_image_url || '',
        link_url: banner.link_url || '',
        open_new_tab: banner.open_new_tab,
        position: banner.position,
        active: banner.active,
      });
    } else {
      setFormData({
        desktop_image_url: '',
        mobile_image_url: '',
        link_url: '',
        open_new_tab: false,
        position: getNextAvailablePosition(),
        active: true,
      });
    }
  }, [banner, existingBanners, isOpen]);

  const getNextAvailablePosition = () => {
    const activeBanners = existingBanners.filter(b => b.active && b.banner_type === bannerType);
    for (let i = 1; i <= maxBanners; i++) {
      if (!activeBanners.find(b => b.position === i)) {
        return i;
      }
    }
    return 1;
  };

  const getAvailablePositions = () => {
    const activeBanners = existingBanners.filter(
      b => b.active && b.banner_type === bannerType && (!banner || b.id !== banner.id)
    );
    const positions = [];
    for (let i = 1; i <= maxBanners; i++) {
      if (!activeBanners.find(b => b.position === i)) {
        positions.push(i);
      }
    }
    return positions;
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
    };

    if (banner) {
      updateBanner.mutate({ id: banner.id, data: dataToSubmit });
    } else {
      createBanner.mutate(dataToSubmit);
    }
    
    onClose();
  };

  const availablePositions = getAvailablePositions();

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

          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="link_url">Link (Opcional)</Label>
              <Input
                id="link_url"
                value={formData.link_url}
                onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
                placeholder="https://exemplo.com ou /produtos"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="open_new_tab"
                checked={formData.open_new_tab}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, open_new_tab: checked }))}
              />
              <Label htmlFor="open_new_tab">Abrir link em nova aba</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="position">Posição</Label>
              <Select
                value={formData.position.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, position: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxBanners }, (_, i) => i + 1).map((pos) => {
                    const isAvailable = availablePositions.includes(pos) || 
                      (banner && banner.position === pos);
                    
                    return (
                      <SelectItem 
                        key={pos} 
                        value={pos.toString()}
                        disabled={formData.active && !isAvailable}
                      >
                        Posição {pos} {!isAvailable && formData.active ? '(Ocupada)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  active: checked,
                  position: checked ? prev.position : getNextAvailablePosition()
                }))}
              />
              <Label htmlFor="active">Banner Ativo</Label>
            </div>
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