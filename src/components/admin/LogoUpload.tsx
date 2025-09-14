import React from 'react';
import { SimpleImageUpload } from './SimpleImageUpload';
import { IMAGE_DIMENSIONS } from '@/constants/imageDimensions';

interface LogoUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
}

export const LogoUpload: React.FC<LogoUploadProps> = ({
  onImageUploaded,
  currentImage,
}) => {
  const logoDimensions = IMAGE_DIMENSIONS.LOGO;

  return (
    <SimpleImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      accept="image/*"
      dimensions={logoDimensions}
      aspectRatio={logoDimensions.aspectRatio}
    />
  );
};