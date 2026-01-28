import React from 'react';
import { useFeature } from '@/hooks/useFeature';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLoading?: boolean;
}

export const FeatureGate: React.FC<FeatureGateProps> = ({
  feature,
  children,
  fallback = null,
  showLoading = true,
}) => {
  const { hasFeature, isLoading } = useFeature(feature);

  if (isLoading && showLoading) {
    return <Skeleton className="h-8 w-full" />;
  }

  if (!hasFeature) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
