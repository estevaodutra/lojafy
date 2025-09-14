import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SimpleImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
  accept?: string;
  maxSize?: number;
  dimensions?: {
    width: number;
    height: number;
    description: string;
    recommendedFormat?: string;
  };
  aspectRatio?: number;
}

export const SimpleImageUpload: React.FC<SimpleImageUploadProps> = ({
  onImageUploaded,
  currentImage,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB
  dimensions,
  aspectRatio,
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

  const uploadImage = useCallback(async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `store/${fileName}`;

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
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    setIsUploading(true);

    try {
      const url = await uploadImage(file);
      onImageUploaded(url);
      toast({
        title: "Imagem enviada",
        description: "A imagem foi enviada com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [onImageUploaded, toast, uploadImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { [accept]: [] },
    maxSize,
    multiple: false,
    disabled: isUploading
  });

  const removeImage = () => {
    onImageUploaded('');
  };

  return (
    <div className="space-y-4">
      {currentImage ? (
        <div className="relative inline-block">
          <img
            src={currentImage}
            alt="Upload preview"
            className="max-w-32 max-h-32 object-cover rounded-lg border"
            style={dimensions ? {
              maxWidth: Math.min(200, dimensions.width),
              maxHeight: Math.min(200, dimensions.height),
              aspectRatio: aspectRatio || 'auto'
            } : undefined}
          />
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={removeImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
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
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm font-medium mb-1">
            {isDragActive ? 'Solte a imagem aqui' : 'Envie uma imagem'}
          </p>
          <p className="text-xs text-muted-foreground">
            {dimensions ? `Recomendado: ${dimensions.width}x${dimensions.height}px` : 'Clique ou arraste para selecionar'}
          </p>
          {dimensions && (
            <p className="text-xs text-muted-foreground mt-1">
              {dimensions.description} • {dimensions.recommendedFormat}
            </p>
          )}
          {isUploading && (
            <div className="mt-2">
              <div className="animate-pulse text-xs">Enviando...</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};