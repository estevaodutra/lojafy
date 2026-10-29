import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useResellerOrders, type ResellerOrder } from "@/hooks/useResellerOrders";
import { Search, Package, Download, MapPin, AlertCircle, QrCode, Copy, Check, Clock, RefreshCw, ShoppingBag } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig, type OrderStatus } from "@/constants/orderStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

function ResellerOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPixOrder, setSelectedPixOrder] = useState<ResellerOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [downloadingLabelId, setDownloadingLabelId] = useState<string | null>(null);
  const [isManualImportOpen, setIsManualImportOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");
  const [isImportingManual, setIsImportingManual] = useState(false);

  const { data: orders, isLoading } = useResellerOrders(statusFilter, searchTerm);

  const handleDownloadLabel = async (order: ResellerOrder) => {
    setDownloadingLabelId(order.id);
    try {
      if (order.ml_label_url) {
        window.open(order.ml_label_url, '_blank');
        toast({
          title: "Etiqueta aberta!",
          description: `Visualizando etiqueta do pedido #${order.order_number}.`,
        });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Não autenticado",
          description: "Faça login novamente para baixar a etiqueta.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Buscando etiqueta...",
        description: "Obtendo arquivo oficial do Mercado Livre...",
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `${supabaseUrl}/functions/v1/ml-get-label?order_id=${order.id}`;

      const res = await fetch(url, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro ${res.status} ao obter etiqueta no Mercado Livre.`);
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `etiqueta-${order.order_number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Etiqueta baixada!",
        description: `Download do PDF do pedido #${order.order_number} concluído.`,
      });
    } catch (err: any) {
      console.error('Erro ao baixar etiqueta:', err);
      toast({
        title: "Não foi possível baixar a etiqueta",
        description: err.message || "Tente novamente ou verifique o status da remessa no Mercado Livre.",
        variant: "destructive",
      });
    } finally {
      setDownloadingLabelId(null);
    }
  };

  const handleCopyPix = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Código Pix copiado!",
        description: "Cole no app do seu banco para efetuar o pagamento.",
      });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Selecione e copie o código manualmente.",
        variant: "destructive",
      });
    }
  };

  const handleSyncOrders = async () => {
    if (!user?.id) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ml-order-webhook', {
        body: { action: 'sync_reseller_orders', user_id: user.id },
      });

      if (error) throw error;

      if (data?.not_connected || data?.success === false) {
        toast({
          title: "Mercado Livre não conectado",
          description: data?.error || "Você precisa conectar sua conta do Mercado Livre no menu 'Lojafy Integra' antes de sincronizar.",
          variant: "destructive",
        });
        return;
      }

      await queryClient.invalidateQueries({ queryKey: ["reseller-orders"] });

      if (data?.summary?.imported > 0) {
        toast({
          title: "Pedidos Sincronizados!",
          description: `${data.summary.imported} novo(s) pedido(s) importado(s) do Mercado Livre com sucesso.`,
        });
      } else if (data?.summary?.already_existed > 0) {
        toast({
          title: "Tudo atualizado",
          description: `Os ${data.summary.already_existed} pedidos recentes do Mercado Livre já constam no seu painel.`,
        });
      } else {
        toast({
          title: "Sincronização concluída",
          description: "Nenhum novo pedido pago encontrado na sua conta do Mercado Livre.",
        });
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar pedidos:", err);
      toast({
        title: "Erro ao sincronizar",
        description: err.message || "Não foi possível puxar pedidos do Mercado Livre agora.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualImportOrder = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanId = manualOrderId.replace(/\D/g, "").trim();
    if (!cleanId) {
      toast({
        title: "Número inválido",
        description: "Informe o número do pedido do Mercado Livre (ex: 2000015725821079).",
        variant: "destructive",
      });
      return;
    }

    setIsImportingManual(true);
    try {
      const { data, error } = await supabase.functions.invoke('ml-order-webhook', {
        body: { action: 'process_order', order_id: cleanId, user_id: user?.id },
      });

      if (error || data?.error) {
        throw new Error(data?.error || error?.message || "Falha ao importar pedido.");
      }

      await queryClient.invalidateQueries({ queryKey: ["reseller-orders"] });

      if (data?.already_processed) {
        toast({
          title: "Pedido já cadastrado",
          description: `O pedido #${cleanId} já está no seu sistema como #${data.order_number || ""}.`,
        });
      } else {
        toast({
          title: "Pedido importado com sucesso!",
          description: `Pedido ML #${cleanId} registrado com sucesso (Pedido #${data.order_number}).`,
        });
      }
      setIsManualImportOpen(false);
      setManualOrderId("");
    } catch (err: any) {
      console.error("Erro ao importar pedido manual:", err);
      toast({
        title: "Erro ao importar pedido",
        description: err.message || "Verifique se o pedido está pago e pertence à sua conta ML.",
        variant: "destructive",
      });
    } finally {
      setIsImportingManual(false);
    }
  };

  const getStatusCounts = () => {
    if (!orders) return { all: 0 } as Record<string, number>;
    
    const counts: Record<string, number> = { all: orders.length };
    ALL_STATUSES.forEach(s => {
      counts[s] = orders.filter(o => o.status === s).length;
    });
    return counts;
  };

  const counts = getStatusCounts();

  const visibleTabs: (OrderStatus | "all")[] = ["all", ...ALL_STATUSES];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Pedidos</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe todos os pedidos da sua loja
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsManualImportOpen(true)}
            className="gap-2 text-xs"
          >
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            Puxar Pedido por Nº ML
          </Button>

          <Button
            size="sm"
            onClick={handleSyncOrders}
            disabled={isSyncing}
            className="gap-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold text-xs shadow-xs"
          >
            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
            {isSyncing ? "Sincronizando..." : "Sincronizar Mercado Livre"}
          </Button>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Pedidos</CardDescription>
            <CardTitle className="text-3xl">{counts.all}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{counts.pendente || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Recebidos</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{counts.recebido || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Enviados</CardDescription>
            <CardTitle className="text-3xl text-purple-600">{counts.enviado || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número do pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs de Status */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="flex-wrap h-auto">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab === "all" ? "Todos" : ORDER_STATUS_CONFIG[tab].label} ({counts[tab] || 0})
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusInfo = getStatusConfig(order.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                            <Badge className={statusInfo.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo.label}
                            </Badge>
                            {order.payment_status === "approved" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Pago
                              </Badge>
                            )}
                            {order.payment_method === 'mercadolivre' && (
                              <Badge className="bg-yellow-400 text-yellow-900 hover:bg-yellow-400 text-xs">
                                🛒 Mercado Livre
                              </Badge>
                            )}
                            {order.payment_status === 'pending' && order.pix_qr_code && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs">
                                <Clock className="h-3 w-3 mr-1" />
                                Pix Fulfillment Pendente
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              <strong>Cliente:</strong>{" "}
                              {order.profiles
                                ? `${order.profiles.first_name} ${order.profiles.last_name}`
                                : order.payment_method === 'mercadolivre' ? 'Comprador ML' : "Cliente"}
                            </p>
                            <p>
                              <strong>Data:</strong>{" "}
                              {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                            {order.shipping_address && (
                              <p>
                                <strong>Endereço:</strong>{" "}
                                {order.shipping_address.city}, {order.shipping_address.state}
                              </p>
                            )}
                            {order.tracking_code && (
                              <p className="flex items-center gap-1 text-blue-600">
                                <MapPin className="h-3 w-3" />
                                <strong>Rastreio:</strong> {order.tracking_code}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <p className="text-2xl font-bold text-primary">
                            R$ {Number(order.total_amount).toFixed(2)}
                          </p>
                          {order.status === "etiqueta_incorreta" && (
                            <Button
                              size="sm"
                              className="text-xs gap-1 bg-rose-600 hover:bg-rose-700 text-white w-full md:w-auto"
                              onClick={() => navigate(`/reseller/pedidos/corrigir-etiqueta/${order.id}`)}
                            >
                              <AlertCircle className="h-3 w-3" />
                              Corrigir Etiqueta
                            </Button>
                          )}
                          {order.payment_status === "pending" && order.pix_qr_code && (
                            <Button
                              size="sm"
                              className="text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm w-full md:w-auto"
                              onClick={() => setSelectedPixOrder(order)}
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              Pagar Pix (Fulfillment)
                            </Button>
                          )}
                          {(order.ml_shipment_id || order.ml_label_url || (order as any).has_shipping_file) && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={downloadingLabelId === order.id}
                              className="text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              onClick={() => handleDownloadLabel(order)}
                            >
                              {downloadingLabelId === order.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <Download className="h-3 w-3" />
                              )}
                              Etiqueta
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? "Tente buscar com outros termos"
                    : "Os pedidos da sua loja aparecerão aqui"}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSyncOrders}
                    disabled={isSyncing}
                    className="gap-1.5 text-xs"
                  >
                    <RefreshCw className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")} />
                    Sincronizar Agora
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog para Importar por Número de Pedido ML */}
      <Dialog open={isManualImportOpen} onOpenChange={setIsManualImportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-yellow-500" />
              Puxar Pedido do Mercado Livre
            </DialogTitle>
            <DialogDescription>
              Cole o número do pedido gerado no Mercado Livre (ex: 2000015725821079) para importar e processar imediatamente no sistema.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleManualImportOrder} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Número do Pedido ML
              </label>
              <Input
                placeholder="Ex: 2000015725821079"
                value={manualOrderId}
                onChange={(e) => setManualOrderId(e.target.value)}
                className="font-mono text-sm"
                required
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Localize esse código na lista de vendas do seu Mercado Livre (número iniciado com #).
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsManualImportOpen(false)}
                disabled={isImportingManual}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isImportingManual || !manualOrderId.trim()}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold gap-1.5"
              >
                <RefreshCw className={cn("h-4 w-4", isImportingManual && "animate-spin")} />
                {isImportingManual ? "Importando..." : "Importar Pedido"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento Pix para Fulfillment */}
      <Dialog open={!!selectedPixOrder} onOpenChange={(open) => !open && setSelectedPixOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              Pagar Pix de Fulfillment
            </DialogTitle>
            <DialogDescription>
              Pedido #{selectedPixOrder?.order_number}
              {selectedPixOrder?.ml_order_id && ` • Mercado Livre #${selectedPixOrder.ml_order_id}`}
            </DialogDescription>
          </DialogHeader>

          {selectedPixOrder && (
            <div className="space-y-4 pt-2">
              {selectedPixOrder.notes && (
                <div className="p-3 bg-muted/60 rounded-md text-xs text-muted-foreground">
                  {selectedPixOrder.notes}
                </div>
              )}

              {selectedPixOrder.pix_qr_code_base64 && (
                <div className="flex flex-col items-center justify-center p-3 bg-white rounded-lg border">
                  <img
                    src={
                      selectedPixOrder.pix_qr_code_base64.startsWith("data:")
                        ? selectedPixOrder.pix_qr_code_base64
                        : `data:image/png;base64,${selectedPixOrder.pix_qr_code_base64}`
                    }
                    alt="QR Code Pix"
                    className="w-48 h-48 object-contain"
                  />
                  <span className="text-xs text-muted-foreground mt-2">
                    Abra o app do seu banco e aponte a câmera
                  </span>
                </div>
              )}

              {selectedPixOrder.pix_qr_code && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground block">
                    Pix Copia e Cola
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={selectedPixOrder.pix_qr_code}
                      className="text-xs font-mono bg-muted/40 select-all"
                    />
                    <Button
                      size="sm"
                      className="shrink-0 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => handleCopyPix(selectedPixOrder.pix_qr_code!)}
                    >
                      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-xs">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  Prazo de <strong>24 horas</strong> para pagamento. Assim que pago, o pedido é liberado automaticamente para o fornecedor enviar.
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ResellerOrders;
