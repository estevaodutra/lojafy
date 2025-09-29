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
    width: 768,
    height: 432,
    description: "Banner otimizado para mobile (768x432px)",
    aspectRatio: 16 / 9,
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