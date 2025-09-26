import React from 'react';
import { SimpleImageUpload } from './SimpleImageUpload';
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
    <SimpleImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      accept="image/*"
      dimensions={avatarDimensions}
      aspectRatio={avatarDimensions.aspectRatio}
    />
  );
};