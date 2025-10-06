import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BannerUpload } from './BannerUpload';
import { MobileBannerUpload } from './MobileBannerUpload';

interface Banner {
  id: string;
  title?: string;
  subtitle?: string;
  description?: string;
  image_url: string;
  mobile_image_url?: string;
  mobile_height?: number;
  link_url?: string;
  open_new_tab: boolean;
  banner_type: 'carousel' | 'featured';
  button_text?: string;
  button_link?: string;
  position: number;
  active: boolean;
}

interface BannerFormProps {
  isOpen: boolean;
  onClose: () => void;
  banner?: Banner | null;
  bannerType: 'carousel' | 'featured';
  existingBanners: Banner[];
}


const BannerForm: React.FC<BannerFormProps> = ({ isOpen, onClose, banner, bannerType, existingBanners }) => {
  const [formData, setFormData] = useState({
    title: '',
    image_url: '',
    mobile_image_url: '',
    link_url: '',
    open_new_tab: false,
    position: 1,
    active: true
  });
  
  const [imageOnly, setImageOnly] = useState(true);
  const maxBanners = bannerType === 'carousel' ? 5 : 6;
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when banner changes or dialog opens/closes
  useEffect(() => {
    if (banner) {
      setImageOnly(true);
      setFormData({
        title: banner.title || '',
        image_url: banner.image_url,
        mobile_image_url: banner.mobile_image_url || '',
        link_url: banner.link_url || '',
        open_new_tab: banner.open_new_tab,
        position: banner.position,
        active: banner.active
      });
    } else {
      setImageOnly(true);
      setFormData({
        title: '',
        image_url: '',
        mobile_image_url: '',
        link_url: '',
        open_new_tab: false,
        position: getNextAvailablePosition(),
        active: true
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
    const activeBanners = existingBanners.filter(b => b.active && b.banner_type === bannerType && (!banner || b.id !== banner.id));
    const positions = [];
    for (let i = 1; i <= maxBanners; i++) {
      if (!activeBanners.find(b => b.position === i)) {
        positions.push(i);
      }
    }
    return positions;
  };

  const createBannerMutation = useMutation({
    mutationFn: async (data: typeof formData & { banner_type: 'carousel' | 'featured' }) => {
      const { error } = await supabase
        .from('banners')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['featured-banners'] });
      toast({
        title: "Banner criado",
        description: "O banner foi criado com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar banner",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateBannerMutation = useMutation({
    mutationFn: async (data: typeof formData & { banner_type: 'carousel' | 'featured' }) => {
      if (!banner) throw new Error('Banner não encontrado');
      
      const { error } = await supabase
        .from('banners')
        .update(data)
        .eq('id', banner.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      queryClient.invalidateQueries({ queryKey: ['featured-banners'] });
      toast({
        title: "Banner atualizado",
        description: "O banner foi atualizado com sucesso.",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar banner",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.image_url) {
      toast({
        title: "Erro de validação",
        description: "É necessário adicionar uma imagem para o banner.",
        variant: "destructive",
      });
      return;
    }

    const dataToSubmit = {
      ...formData,
      title: formData.title || '',
      banner_type: bannerType
    };

    if (banner) {
      updateBannerMutation.mutate(dataToSubmit);
    } else {
      createBannerMutation.mutate(dataToSubmit);
    }
  };

  const handleImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
  };

  const handleMobileImageUploaded = (url: string) => {
    setFormData(prev => ({ ...prev, mobile_image_url: url }));
  };

  const availablePositions = getAvailablePositions();
  const isPositionDisabled = formData.active && !availablePositions.includes(formData.position) && 
    (!banner || banner.position !== formData.position);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {banner ? 'Editar Banner' : 'Novo Banner'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Imagem do Banner *</Label>
              <BannerUpload
                onImageUploaded={handleImageUploaded}
                currentImage={formData.image_url}
              />
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Imagem para Mobile (Opcional)</Label>
                <MobileBannerUpload
                  onImageUploaded={handleMobileImageUploaded}
                  currentImage={formData.mobile_image_url}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
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
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createBannerMutation.isPending || updateBannerMutation.isPending}
            >
              {createBannerMutation.isPending || updateBannerMutation.isPending 
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

export default BannerForm;