import React from 'react';
import { FileUploadArea } from '@/components/FileUploadArea';
import { UploadedFile } from '@/hooks/useFileUpload';
import { IMAGE_DIMENSIONS } from '@/constants/imageDimensions';

interface EnhancedImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
  uploadType?: 'product' | 'banner' | 'testimonial' | 'logo' | 'store';
  maxSizeMB?: number;
  multiple?: boolean;
}

const getImageConfig = (uploadType: string) => {
  switch (uploadType) {
    case 'banner':
      return {
        dimensions: IMAGE_DIMENSIONS.BANNER,
        folder: 'banners',
        description: 'Imagem principal do banner promocional'
      };
    case 'testimonial':
      return {
        dimensions: IMAGE_DIMENSIONS.TESTIMONIAL_AVATAR,
        folder: 'testimonials',
        description: 'Foto do cliente para o depoimento'
      };
    case 'logo':
      return {
        dimensions: IMAGE_DIMENSIONS.LOGO,
        folder: 'logos',
        description: 'Logotipo da loja'
      };
    case 'product':
    default:
      return {
        dimensions: IMAGE_DIMENSIONS.PRODUCT,
        folder: 'products',
        description: 'Imagem do produto'
      };
  }
};

export const EnhancedImageUpload: React.FC<EnhancedImageUploadProps> = ({
  onImageUploaded,
  currentImage,
  uploadType = 'product',
  maxSizeMB = 5,
  multiple = false
}) => {
  const config = getImageConfig(uploadType);

  const handleFilesUploaded = (files: UploadedFile[]) => {
    if (files.length > 0) {
      onImageUploaded(files[0].url || '');
    }
  };

  const handleFileRemoved = () => {
    onImageUploaded('');
  };

  return (
    <div className="space-y-4">
      {currentImage && (
        <div className="relative inline-block">
          <img
            src={currentImage}
            alt="Imagem atual"
            className="max-w-48 max-h-48 object-cover rounded-lg border shadow-sm"
            style={{
              aspectRatio: config.dimensions.aspectRatio || 'auto'
            }}
          />
        </div>
      )}
      
      <FileUploadArea
        bucket="product-images"
        folder={config.folder}
        maxSizeMB={maxSizeMB}
        allowedTypes={['image/jpeg', 'image/png', 'image/webp']}
        label="Enviar Imagem"
        description={`${config.description} • Recomendado: ${config.dimensions.width}x${config.dimensions.height}px`}
        multiple={multiple}
        enableRetry={true}
        maxRetries={2}
        onFilesUploaded={handleFilesUploaded}
        onFileRemoved={handleFileRemoved}
        showProgress={true}
        showFileList={false}
      />
    </div>
  );
};