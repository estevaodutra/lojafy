import React from 'react';
import { SimpleImageUpload } from './SimpleImageUpload';

interface MobileBannerUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
}

export const MobileBannerUpload: React.FC<MobileBannerUploadProps> = ({
  onImageUploaded,
  currentImage,
}) => {
  const mobileBannerDimensions = {
    width: 800,
    height: 1000,
    description: "Banner otimizado para mobile (800x1000px, proporção 4:5)",
    aspectRatio: 4 / 5,
  };

  return (
    <SimpleImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      accept="image/*"
      dimensions={mobileBannerDimensions}
      aspectRatio={mobileBannerDimensions.aspectRatio}
    />
  );
};