import { useNavigate } from 'react-router-dom';
import { MetaAdsManagerView } from '@/components/admin/MetaAdsManagerView';
import { AutoCategorizeButton } from '@/components/admin/AutoCategorizeButton';

const SupplierProductManagement = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <AutoCategorizeButton />
      </div>
      <MetaAdsManagerView
        roleMode="supplier"
        onNavigateToCreateProduct={() => navigate('/supplier/produtos/novo')}
        onEditProduct={(product) => navigate(`/supplier/produtos/${product.id}`)}
      />
    </div>
  );
};

export default SupplierProductManagement;
