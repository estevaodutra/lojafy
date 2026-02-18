import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Star, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ImageFile {
  id: string;
  file: File;
  preview: string;
  url?: string;
  isMain: boolean;
  isUploading: boolean;
}

interface ImageUploadAreaProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  productId?: string;
  existingImages?: string[]; // URLs of existing images
}

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  productId,
  existingImages = []
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = useCallback(async (file: File, imageId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = productId ? `products/${productId}/${fileName}` : `temp/${fileName}`;

      const { data, error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }, [productId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      toast({
        title: "Limite de imagens excedido",
        description: `Você pode enviar no máximo ${maxImages} imagens por produto.`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    const newImages: ImageFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      isMain: images.length === 0 && index === 0, // First image is main if no images exist
      isUploading: true
    }));

    // Add images to state immediately for preview
    onImagesChange([...images, ...newImages]);

    // Upload images
    const uploadPromises = newImages.map(async (image) => {
      try {
        const url = await uploadImage(image.file, image.id);
        return { ...image, url, isUploading: false };
      } catch (error) {
        toast({
          title: "Erro no upload",
          description: `Falha ao enviar ${image.file.name}`,
          variant: "destructive"
        });
        return null;
      }
    });

    try {
      const uploadedImages = await Promise.all(uploadPromises);
      const validImages = uploadedImages.filter(img => img !== null) as ImageFile[];
      
      // Update images with uploaded URLs
      const allImages = images.concat(validImages);
      onImagesChange(allImages);
      
      toast({
        title: "Imagens enviadas",
        description: `${validImages.length} imagem(ns) enviada(s) com sucesso.`
      });
    } finally {
      setIsUploading(false);
    }
  }, [images, maxImages, onImagesChange, toast, uploadImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024, // 5MB
    disabled: isUploading
  });

  const removeImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    
    // If we removed the main image, set the first remaining image as main
    if (updatedImages.length > 0 && !updatedImages.some(img => img.isMain)) {
      updatedImages[0].isMain = true;
    }
    
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);


  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-primary/50'
          }
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          {isDragActive ? 'Solte as imagens aqui' : 'Envie suas imagens'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Arraste e solte ou clique para selecionar imagens
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, WebP até 5MB • Máximo {maxImages} imagens
        </p>
        {isUploading && (
          <div className="mt-4">
            <div className="animate-pulse text-sm">Enviando imagens...</div>
          </div>
        )}
      </div>

      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Imagens do Produto ({images.length}/{maxImages})
            </h4>
            <Badge variant="secondary">
              {images.filter(img => img.isMain).length > 0 ? 'Imagem principal selecionada' : 'Selecione uma imagem principal'}
            </Badge>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <Card key={image.id} className="relative overflow-hidden group">
                <div className="aspect-square">
                  <img
                    src={image.url || image.preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  
                  {image.isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                  
                  {images.indexOf(image) === 0 && (
                    <Badge className="absolute top-2 left-2" variant="default">
                      <Star className="h-3 w-3 mr-1" />
                      Principal
                    </Badge>
                  )}
                </div>

                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeImage(image.id)}
                    disabled={image.isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};