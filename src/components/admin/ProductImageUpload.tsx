import React from 'react';
import { SimpleImageUpload } from './SimpleImageUpload';
import { IMAGE_DIMENSIONS } from '@/constants/imageDimensions';

interface ProductImageUploadProps {
  onImageUploaded: (url: string) => void;
  currentImage?: string | null;
}

export const ProductImageUpload: React.FC<ProductImageUploadProps> = ({
  onImageUploaded,
  currentImage,
}) => {
  const productDimensions = IMAGE_DIMENSIONS.PRODUCT;

  return (
    <SimpleImageUpload
      onImageUploaded={onImageUploaded}
      currentImage={currentImage}
      accept="image/*"
      dimensions={productDimensions}
      aspectRatio={productDimensions.aspectRatio}
    />
  );
};