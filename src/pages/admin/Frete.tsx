import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Settings, Calculator, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShippingMethodForm } from "@/components/admin/ShippingMethodForm";
import { ShippingCalculator } from "@/components/admin/ShippingCalculator";
import { ShippingReports } from "@/components/admin/ShippingReports";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Frete() {
  const [selectedMethod, setSelectedMethod] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: shippingMethods, isLoading, refetch } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipping_methods")
        .select("*")
        .order("priority");
      
      if (error) throw error;
      return data;
    },
  });

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("shipping_methods")
      .update({ active: !currentStatus })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar status do método de frete");
      return;
    }

    toast.success("Status do método atualizado com sucesso");
    refetch();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("shipping_methods")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir método de frete");
      return;
    }

    toast.success("Método de frete excluído com sucesso");
    refetch();
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedMethod(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Frete</h1>
          <p className="text-muted-foreground">
            Configure métodos de envio, valores e regras para sua loja
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedMethod(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Método de Frete
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <ShippingMethodForm
              method={selectedMethod}
              onSuccess={handleFormSuccess}
              onCancel={() => setIsFormOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="methods" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="methods" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Métodos de Frete
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {shippingMethods?.map((method) => (
              <Card key={method.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{method.name}</CardTitle>
                    <Badge variant={method.active ? "default" : "secondary"}>
                      {method.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {method.description && (
                    <CardDescription>{method.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Prazo:</span>
                      <div className="font-medium">
                        {method.estimated_days === 0 ? 'Imediato' : `${method.estimated_days} dias`}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Preço:</span>
                      <div className="font-medium">
                        R$ {Number(method.base_price).toFixed(2)}
                      </div>
                    </div>
                  </div>
                  
                  {method.is_free_above_amount && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Grátis acima de:</span>
                      <div className="font-medium text-green-600">
                        R$ {Number(method.is_free_above_amount).toFixed(2)}
                      </div>
                    </div>
                  )}

                  {method.is_label_method && (
                    <Badge variant="outline" className="text-xs">
                      Método com Etiqueta
                    </Badge>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMethod(method);
                        setIsFormOpen(true);
                      }}
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleStatus(method.id, method.active)}
                    >
                      {method.active ? "Desativar" : "Ativar"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calculator">
          <ShippingCalculator />
        </TabsContent>

        <TabsContent value="reports">
          <ShippingReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}