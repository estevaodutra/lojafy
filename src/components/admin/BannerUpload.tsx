import React from 'react';
import { EnhancedImageUpload } from './EnhancedImageUpload';
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
    <EnhancedImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      uploadType="banner"
      maxSizeMB={10}
    />
  );
};