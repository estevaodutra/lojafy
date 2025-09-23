import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import Carrinho from "./Carrinho";

const PublicStoreCart = () => {
  const { store } = usePublicStoreContext();

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
      <Carrinho />
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreCart;