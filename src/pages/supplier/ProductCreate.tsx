import { useNavigate } from 'react-router-dom';
import ProductForm from '@/components/admin/ProductForm';

const SupplierProductCreate = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Produto</h1>
        <p className="text-muted-foreground">
          Cadastre um novo produto no catálogo do fornecedor com dados completos, preços e imagens.
        </p>
      </div>

      <ProductForm
        onSuccess={() => {
          navigate('/supplier/produtos');
        }}
        onCancel={() => {
          navigate('/supplier/produtos');
        }}
      />
    </div>
  );
};

export default SupplierProductCreate;
