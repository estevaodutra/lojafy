import { useNavigate } from 'react-router-dom';
import { MetaAdsManagerView } from '@/components/admin/MetaAdsManagerView';

const SupplierProductManagement = () => {
  const navigate = useNavigate();

  return (
    <MetaAdsManagerView
      roleMode="supplier"
      onNavigateToCreateProduct={() => navigate('/supplier/produtos/novo')}
      onEditProduct={(product) => navigate(`/supplier/produtos/${product.id}`)}
    />
  );
};

export default SupplierProductManagement;
