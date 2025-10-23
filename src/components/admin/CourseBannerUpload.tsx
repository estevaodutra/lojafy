import React from 'react';
import { SimpleImageUpload } from './SimpleImageUpload';
import { IMAGE_DIMENSIONS } from '@/constants/imageDimensions';

interface CourseBannerUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
}

export const CourseBannerUpload: React.FC<CourseBannerUploadProps> = ({
  onImageUploaded,
  currentImage,
}) => {
  const courseBannerDimensions = IMAGE_DIMENSIONS.COURSE_BANNER;

  return (
    <SimpleImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      accept="image/*"
      dimensions={courseBannerDimensions}
      aspectRatio={courseBannerDimensions.aspectRatio}
    />
  );
};
