import React from 'react';
import { SimpleImageUpload } from '@/components/admin/SimpleImageUpload';

interface ResellerBannerUploadProps {
  onDesktopImageUploaded: (url: string) => void;
  onMobileImageUploaded?: (url: string) => void;
  currentDesktopImage?: string;
  currentMobileImage?: string;
  bannerType: 'carousel' | 'featured';
}

export const ResellerBannerUpload: React.FC<ResellerBannerUploadProps> = ({
  onDesktopImageUploaded,
  onMobileImageUploaded,
  currentDesktopImage,
  currentMobileImage,
  bannerType,
}) => {
  const dimensions = bannerType === 'carousel' 
    ? { width: 1200, height: 600, description: 'Banner Rotativo Desktop (2:1)', recommendedFormat: 'JPG, PNG ou WEBP' }
    : { width: 1200, height: 600, description: 'Banner Destaque Desktop (2:1)', recommendedFormat: 'JPG, PNG ou WEBP' };

  const mobileDimensions = { 
    width: 768, 
    height: 384, 
    description: `Banner ${bannerType === 'carousel' ? 'Rotativo' : 'Destaque'} Mobile (2:1)`, 
    recommendedFormat: 'JPG, PNG ou WEBP' 
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Imagem Desktop *</label>
        <p className="text-xs text-muted-foreground">
          Recomendado: {dimensions.width}x{dimensions.height}px
        </p>
        <SimpleImageUpload
          onImageUploaded={onDesktopImageUploaded}
          currentImage={currentDesktopImage}
          accept="image/*"
          dimensions={dimensions}
          aspectRatio={dimensions.width / dimensions.height}
        />
      </div>

      {onMobileImageUploaded && (
        <div className="space-y-2 pt-4 border-t">
          <label className="text-sm font-medium">Imagem Mobile (Opcional)</label>
          <p className="text-xs text-muted-foreground">
            Recomendado: {mobileDimensions.width}x{mobileDimensions.height}px
          </p>
          <SimpleImageUpload
            onImageUploaded={onMobileImageUploaded}
            currentImage={currentMobileImage}
            accept="image/*"
            dimensions={mobileDimensions}
            aspectRatio={mobileDimensions.width / mobileDimensions.height}
          />
        </div>
      )}
    </div>
  );
};