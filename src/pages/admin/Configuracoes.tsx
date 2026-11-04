import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Plataforma from "./Plataforma";
import SupportManagement from "./SupportManagement";
import NotificationsManagement from "./NotificationsManagement";
import AIKnowledgeBase from "./AIKnowledgeBase";
import ShippingCutoffSettings from "@/components/admin/ShippingCutoffSettings";
import WalletSettings from "@/components/admin/WalletSettings";
import { MercadoLivreSettings } from "@/components/admin/MercadoLivreSettings";
import { OrderPipelinesSettings } from "@/components/admin/OrderPipelinesSettings";
import { useUserRole } from "@/hooks/useUserRole";

const Configuracoes = () => {
  const { isSuperAdmin } = useUserRole();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configure plataforma e recursos avançados
        </p>
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="platform">Plataforma</TabsTrigger>
          {isSuperAdmin() && (
            <TabsTrigger value="pipelines">Pipelines de Pedidos</TabsTrigger>
          )}
          <TabsTrigger value="mercadolivre">Mercado Livre</TabsTrigger>
          <TabsTrigger value="shipping">Envio</TabsTrigger>
          <TabsTrigger value="wallet">Carteira</TabsTrigger>
          <TabsTrigger value="support">Suporte</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="ai">Base de Conhecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="space-y-4">
          <Plataforma />
        </TabsContent>

        {isSuperAdmin() && (
          <TabsContent value="pipelines" className="space-y-4">
            <OrderPipelinesSettings />
          </TabsContent>
        )}

        <TabsContent value="mercadolivre" className="space-y-4">
          <MercadoLivreSettings />
        </TabsContent>

        <TabsContent value="shipping" className="space-y-4">
          <ShippingCutoffSettings />
        </TabsContent>

        <TabsContent value="wallet" className="space-y-4">
          <WalletSettings />
        </TabsContent>

        <TabsContent value="support" className="space-y-4">
          <SupportManagement />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsManagement />
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <AIKnowledgeBase />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Configuracoes;
