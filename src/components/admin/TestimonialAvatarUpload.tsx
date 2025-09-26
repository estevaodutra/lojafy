import React from 'react';
import { EnhancedImageUpload } from './EnhancedImageUpload';
import { IMAGE_DIMENSIONS } from '@/constants/imageDimensions';

interface TestimonialAvatarUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
}

export const TestimonialAvatarUpload: React.FC<TestimonialAvatarUploadProps> = ({
  onImageUploaded,
  currentImage,
}) => {
  const avatarDimensions = IMAGE_DIMENSIONS.TESTIMONIAL_AVATAR;

  return (
    <EnhancedImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      uploadType="testimonial"
      maxSizeMB={3}
    />
  );
};