import React from 'react';
import { SimpleImageUpload } from './SimpleImageUpload';
import { IMAGE_DIMENSIONS } from '@/constants/imageDimensions';

interface BannerUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
}

export const BannerUpload: React.FC<BannerUploadProps> = ({
  onImageUploaded,
  currentImage,
}) => {
  const bannerDimensions = IMAGE_DIMENSIONS.BANNER;

  return (
    <SimpleImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      accept="image/*"
      dimensions={bannerDimensions}
      aspectRatio={bannerDimensions.aspectRatio}
    />
  );
};