import { useParams } from "react-router-dom";
import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import { usePublicStoreProducts } from "@/hooks/usePublicStoreProducts";
import Produto from "./Produto";

const PublicStoreProduct = () => {
  const { id } = useParams<{ id: string }>();
  const { store } = usePublicStoreContext();
  const { data: products = [] } = usePublicStoreProducts(store.reseller_id);
  
  // Find the product in reseller's catalog
  const resellerProduct = products.find(p => p.product.id === id);
  const product = resellerProduct?.product;
  
  if (!product) {
    return (
      <div 
        className="min-h-screen"
        style={{
          '--primary': `hsl(${store.primary_color || '#000000'})`,
          '--secondary': `hsl(${store.secondary_color || '#f3f4f6'})`,
          '--accent': `hsl(${store.accent_color || '#3b82f6'})`,
        } as React.CSSProperties}
      >
        <PublicStoreHeader store={store} />
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
          <p className="text-muted-foreground">O produto que você está procurando não está disponível nesta loja.</p>
        </div>
        <PublicStoreFooter store={store} />
      </div>
    );
  }

  // Create product with custom price if available
  const productWithCustomPrice = {
    ...product,
    price: resellerProduct?.custom_price || product.price
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        '--primary': `hsl(${store.primary_color || '#000000'})`,
        '--secondary': `hsl(${store.secondary_color || '#f3f4f6'})`,
        '--accent': `hsl(${store.accent_color || '#3b82f6'})`,
      } as React.CSSProperties}
    >
      <PublicStoreHeader store={store} />
      <Produto />
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreProduct;