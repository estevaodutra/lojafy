import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomepageManagement from "./Homepage";
import ConfiguracaoVisual from "./ConfiguracaoVisual";
import AdminBanners from "./Banners";
import Depoimentos from "./Depoimentos";
import NewsletterConfig from "./NewsletterConfig";

const Design = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Design da Loja</h1>
        <p className="text-muted-foreground mt-1">
          Personalize a aparência e conteúdo da sua loja
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="visual">Config Visual</TabsTrigger>
          <TabsTrigger value="banners">Banners</TabsTrigger>
          <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <HomepageManagement />
        </TabsContent>

        <TabsContent value="visual" className="space-y-4">
          <ConfiguracaoVisual />
        </TabsContent>

        <TabsContent value="banners" className="space-y-4">
          <AdminBanners />
        </TabsContent>

        <TabsContent value="testimonials" className="space-y-4">
          <Depoimentos />
        </TabsContent>

        <TabsContent value="newsletter" className="space-y-4">
          <NewsletterConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Design;
