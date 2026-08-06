import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MetaAdsManagerView } from '@/components/admin/MetaAdsManagerView';

const ResellerProducts = () => {
  const navigate = useNavigate();

  return (
    <MetaAdsManagerView
      roleMode="reseller"
      onNavigateToCreateProduct={() => navigate('/reseller/catalog')}
    />
  );
};

export default ResellerProducts;