import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminCustomers from "./Customers";
import GestaoUsuarios from "./GestaoUsuarios";

const Clientes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clientes & Usuários</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie clientes e usuários da plataforma
        </p>
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList>
          <TabsTrigger value="customers">Clientes</TabsTrigger>
          <TabsTrigger value="users">Gestão de Usuários</TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <AdminCustomers />
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <GestaoUsuarios />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Clientes;
