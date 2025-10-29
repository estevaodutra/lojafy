import { useState } from "react";
import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import Checkout from "@/pages/Checkout";
import { PremiumRequiredModal } from "@/components/premium/PremiumRequiredModal";

const PublicStoreCheckoutPage = () => {
  const { store } = usePublicStoreContext();
  const [showPremiumModal, setShowPremiumModal] = useState(
    (store as any).subscription_plan === 'free'
  );

  if ((store as any).subscription_plan === 'free') {
    return (
      <div className="min-h-screen">
        <PublicStoreHeader store={store} />
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold mb-4">Checkout Indisponível</h1>
          <p className="text-muted-foreground">
            Esta loja está no plano Free e não pode processar pedidos no momento.
          </p>
        </div>
        <PublicStoreFooter store={store} />
        <PremiumRequiredModal
          isOpen={showPremiumModal}
          onClose={() => setShowPremiumModal(false)}
          title="Processamento de Pedidos Bloqueado"
          message="Esta loja precisa fazer upgrade para o plano Premium para processar pedidos."
          paymentUrl={(store as any).subscription_payment_url || 'https://kwfy.app/c/Qeuh5bFm'}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <PublicStoreHeader store={store} />
      <Checkout showHeader={false} showFooter={false} storeSlug={store.store_slug} />
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreCheckoutPage;