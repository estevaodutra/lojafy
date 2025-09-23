import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import PublicStoreCart from "@/components/public-store/PublicStoreCart";

const PublicStoreCartPage = () => {
  const { store } = usePublicStoreContext();

  return (
    <div className="min-h-screen">
      <PublicStoreHeader store={store} />
      <PublicStoreCart />
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreCartPage;