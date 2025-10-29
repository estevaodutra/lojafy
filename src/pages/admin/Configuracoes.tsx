import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Plataforma from "./Plataforma";
import IntegracaoPage from "./Integracoes";
import SupportManagement from "./SupportManagement";
import NotificationsManagement from "./NotificationsManagement";
import AIKnowledgeBase from "./AIKnowledgeBase";

const Configuracoes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Configure plataforma, integrações e recursos avançados
        </p>
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList>
          <TabsTrigger value="platform">Plataforma</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="support">Suporte</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="ai">Base de Conhecimento</TabsTrigger>
        </TabsList>

        <TabsContent value="platform" className="space-y-4">
          <Plataforma />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegracaoPage />
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
