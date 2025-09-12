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
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

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

interface BannerFormProps {
  isOpen: boolean;
  onClose: () => void;
  banner?: Banner | null;
  existingBanners: Banner[];
}

interface BannerImageFile {
  file: File;
  preview: string;
  uploading: boolean;
}

const BannerForm: React.FC<BannerFormProps> = ({ isOpen, onClose, banner, existingBanners }) => {
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    description: '',
    image_url: '',
    button_text: '',
    button_link: '',
    position: 1,
    active: true
  });
  const [images, setImages] = useState<BannerImageFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when banner changes or dialog opens/closes
  useEffect(() => {
    if (banner) {
      setFormData({
        title: banner.title,
        subtitle: banner.subtitle || '',
        description: banner.description || '',
        image_url: banner.image_url,
        button_text: banner.button_text || '',
        button_link: banner.button_link || '',
        position: banner.position,
        active: banner.active
      });
      setImages([]);
    } else {
      setFormData({
        title: '',
        subtitle: '',
        description: '',
        image_url: '',
        button_text: '',
        button_link: '',
        position: getNextAvailablePosition(),
        active: true
      });
      setImages([]);
    }
  }, [banner, existingBanners, isOpen]);

  const getNextAvailablePosition = () => {
    const activeBanners = existingBanners.filter(b => b.active);
    for (let i = 1; i <= 5; i++) {
      if (!activeBanners.find(b => b.position === i)) {
        return i;
      }
    }
    return 1;
  };

  const getAvailablePositions = () => {
    const activeBanners = existingBanners.filter(b => b.active && (!banner || b.id !== banner.id));
    const positions = [];
    for (let i = 1; i <= 5; i++) {
      if (!activeBanners.find(b => b.position === i)) {
        positions.push(i);
      }
    }
    return positions;
  };

  const createBannerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('banners')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-banners'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
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
    mutationFn: async (data: typeof formData) => {
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
    
    if (!formData.title.trim()) {
      toast({
        title: "Erro de validação",
        description: "O título é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.image_url && images.length === 0) {
      toast({
        title: "Erro de validação",
        description: "É necessário adicionar uma imagem para o banner.",
        variant: "destructive",
      });
      return;
    }

    // Use uploaded image URL if available
    const finalImageUrl = images.length > 0 
      ? `https://bbrmjrjorcgsgeztzbsr.supabase.co/storage/v1/object/public/product-images/${images[0].file.name}`
      : formData.image_url;

    const dataToSubmit = {
      ...formData,
      image_url: finalImageUrl
    };

    if (banner) {
      updateBannerMutation.mutate(dataToSubmit);
    } else {
      createBannerMutation.mutate(dataToSubmit);
    }
  };

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    const fileName = `banner-${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    return `https://bbrmjrjorcgsgeztzbsr.supabase.co/storage/v1/object/public/product-images/${fileName}`;
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]; // Only take the first file
    if (!file) return;

    const preview = URL.createObjectURL(file);
    const newImage: BannerImageFile = {
      file,
      preview,
      uploading: true
    };

    setImages([newImage]);

    try {
      const imageUrl = await uploadImage(file);
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
      setImages([{ ...newImage, uploading: false }]);
    } catch (error) {
      console.error('Upload failed:', error);
      setImages([]);
      toast({
        title: "Erro no upload",
        description: "Falha ao fazer upload da imagem. Tente novamente.",
        variant: "destructive",
      });
    }
  }, [uploadImage, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 1,
    multiple: false
  });

  const removeImage = () => {
    setImages([]);
    setFormData(prev => ({ ...prev, image_url: '' }));
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
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Digite o título do banner"
                required
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Subtítulo</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                placeholder="Digite o subtítulo (opcional)"
              />
            </div>

            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Digite a descrição do banner (opcional)"
                rows={3}
              />
            </div>

            <div>
              <Label>Imagem do Banner *</Label>
              <div className="space-y-4">
                {images.length > 0 ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <img
                        src={images[0].preview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-md border"
                      />
                      {images[0].uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md">
                          <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full"></div>
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${
                        isDragActive ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <div className="space-y-2">
                        <div className="mx-auto w-12 h-12 text-muted-foreground">
                          📸
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {isDragActive
                            ? 'Solte a imagem aqui...'
                            : 'Arraste uma imagem ou clique para selecionar'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, WEBP até 10MB
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-2">
                      <Label htmlFor="image_url">Ou insira URL da imagem</Label>
                      <Input
                        id="image_url"
                        value={formData.image_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                        placeholder="https://exemplo.com/imagem.jpg"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="button_text">Texto do Botão</Label>
                <Input
                  id="button_text"
                  value={formData.button_text}
                  onChange={(e) => setFormData(prev => ({ ...prev, button_text: e.target.value }))}
                  placeholder="Ex: Comprar Agora"
                />
              </div>

              <div>
                <Label htmlFor="button_link">Link do Botão</Label>
                <Input
                  id="button_link"
                  value={formData.button_link}
                  onChange={(e) => setFormData(prev => ({ ...prev, button_link: e.target.value }))}
                  placeholder="/promocoes"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position">Posição</Label>
                <Select
                  value={formData.position.toString()}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, position: parseInt(value) }))}
                  disabled={isPositionDisabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((pos) => {
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