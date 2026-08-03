import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Truck, Settings, Calculator, BarChart3, Clock, Trash2, Calendar, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ShippingMethodForm } from "@/components/admin/ShippingMethodForm";
import { ShippingCalculator } from "@/components/admin/ShippingCalculator";
import { ShippingReports } from "@/components/admin/ShippingReports";
import ShippingCutoffSettings from "@/components/admin/ShippingCutoffSettings";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Logistica() {
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
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        <p className="text-muted-foreground text-sm">Carregando painel logístico...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-indigo-600 to-indigo-800 bg-clip-text text-transparent">
            Painel de Logística
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            Gerencie métodos de envio, horário de corte, etiquetas e regras de entrega globais.
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedMethod(null)} className="shadow-lg hover:shadow-xl transition-all gap-2 bg-gradient-to-r from-primary to-indigo-700">
              <Plus className="w-5 h-5" />
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

      <Tabs defaultValue="methods" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-muted/60 p-1.5 rounded-xl border">
          <TabsTrigger value="methods" className="flex items-center gap-2 rounded-lg py-2.5">
            <Truck className="w-4 h-4" />
            Métodos de Frete
          </TabsTrigger>
          <TabsTrigger value="cutoff" className="flex items-center gap-2 rounded-lg py-2.5">
            <Clock className="w-4 h-4" />
            Horário de Corte
          </TabsTrigger>
          <TabsTrigger value="calculator" className="flex items-center gap-2 rounded-lg py-2.5">
            <Calculator className="w-4 h-4" />
            Calculadora
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2 rounded-lg py-2.5">
            <BarChart3 className="w-4 h-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>

        {/* Métodos de Frete */}
        <TabsContent value="methods" className="space-y-6 outline-none">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {shippingMethods?.map((method) => (
              <Card key={method.id} className="relative overflow-hidden group hover:shadow-md transition-all duration-300 border border-muted-foreground/10 hover:border-indigo-500/30">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-primary to-indigo-600 opacity-80" />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-xl font-bold tracking-tight text-foreground/90">{method.name}</CardTitle>
                    <Badge className="px-2.5 py-0.5 rounded-full text-xs font-semibold" variant={method.active ? "default" : "secondary"}>
                      {method.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {method.description && (
                    <CardDescription className="line-clamp-2 mt-1">{method.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-lg text-sm border border-muted/50">
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block">Prazo de Entrega:</span>
                      <span className="font-bold text-foreground">
                        {method.estimated_days === 0 ? 'Imediato' : `${method.estimated_days} dias`}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground font-medium block">Custo Base:</span>
                      <span className="font-bold text-foreground">
                        R$ {Number(method.base_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {method.is_free_above_amount && (
                      <Badge variant="outline" className="text-xs border-green-600/30 text-green-700 bg-green-50/50 dark:bg-green-950/10">
                        Grátis acima de R$ {Number(method.is_free_above_amount).toFixed(2)}
                      </Badge>
                    )}

                    {method.is_label_method && (
                      <Badge variant="outline" className="text-xs border-indigo-600/30 text-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/10 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        Anexo de Etiqueta
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 hover:bg-muted font-medium"
                      onClick={() => {
                        setSelectedMethod(method);
                        setIsFormOpen(true);
                      }}
                    >
                      <Settings className="w-3.5 h-3.5 mr-1.5" />
                      Editar
                    </Button>
                    <Button
                      variant={method.active ? "secondary" : "outline"}
                      size="sm"
                      className="font-medium"
                      onClick={() => handleToggleStatus(method.id, method.active)}
                    >
                      {method.active ? "Desativar" : "Ativar"}
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Método de Envio?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso removerá permanentemente o método de frete <strong>{method.name}</strong> e impossibilitará que novos clientes o selecionem no checkout.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(method.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/95"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(!shippingMethods || shippingMethods.length === 0) && (
            <div className="text-center py-12 bg-muted/20 border-2 border-dashed rounded-2xl">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
              <h3 className="font-semibold text-lg">Nenhum método de frete configurado</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto mt-1">
                Adicione métodos de envio para permitir o cálculo de frete e finalização de compras no checkout.
              </p>
              <Button onClick={() => setIsFormOpen(true)} className="mt-4 gap-2">
                <Plus className="w-4 h-4" /> Cadastrar Primeiro Método
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Horário de Corte */}
        <TabsContent value="cutoff" className="outline-none">
          <div className="max-w-3xl">
            <ShippingCutoffSettings />
          </div>
        </TabsContent>

        {/* Calculadora */}
        <TabsContent value="calculator" className="outline-none">
          <div className="max-w-4xl">
            <ShippingCalculator />
          </div>
        </TabsContent>

        {/* Relatórios */}
        <TabsContent value="reports" className="outline-none">
          <div className="max-w-6xl">
            <ShippingReports />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
