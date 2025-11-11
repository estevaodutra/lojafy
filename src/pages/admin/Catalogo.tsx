import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminProducts from "./Products";
import AdminCategorias from "./Categorias";
import Frete from "./Frete";
import ProductApproval from "./ProductApproval";
import { CheckSquare } from "lucide-react";

const Catalogo = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Catálogo</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie produtos, categorias, aprovações e métodos de frete
        </p>
      </div>

      <Tabs defaultValue="products" className="space-y-6">
        <TabsList>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="approval">
            <CheckSquare className="w-4 h-4 mr-2" />
            Aprovação
          </TabsTrigger>
          <TabsTrigger value="shipping">Frete</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-4">
          <AdminProducts />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <AdminCategorias />
        </TabsContent>

        <TabsContent value="approval" className="space-y-4">
          <ProductApproval />
        </TabsContent>

        <TabsContent value="shipping" className="space-y-4">
          <Frete />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Catalogo;
