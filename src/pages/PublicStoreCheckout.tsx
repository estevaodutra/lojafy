import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import Checkout from "@/pages/Checkout";

const PublicStoreCheckoutPage = () => {
  const { store } = usePublicStoreContext();

  return (
    <div className="min-h-screen">
      <PublicStoreHeader store={store} />
      <Checkout showHeader={false} showFooter={false} storeSlug={store.store_slug} />
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreCheckoutPage;