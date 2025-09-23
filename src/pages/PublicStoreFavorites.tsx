import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import PublicStoreFavorites from "@/components/public-store/PublicStoreFavorites";

const PublicStoreFavoritesPage = () => {
  const { store } = usePublicStoreContext();

  return (
    <div className="min-h-screen">
      <PublicStoreHeader store={store} />
      <PublicStoreFavorites />
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreFavoritesPage;