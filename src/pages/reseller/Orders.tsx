import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useResellerOrders, type ResellerOrder } from "@/hooks/useResellerOrders";
import { Search, Package, Download, MapPin, AlertCircle, QrCode, Copy, Check, Clock, RefreshCw, ShoppingBag, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig, type OrderStatus } from "@/constants/orderStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { OrderPipelineView } from "@/components/pipeline/OrderPipelineView";
import { normalizeOrderToPipelineItem } from "@/utils/orderPipelineAdapter";
import { OrderPipelineItem } from "@/types/orderPipeline";
import OrderDetailsModal from "@/components/OrderDetailsModal";

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
  const [generatingPixOrderId, setGeneratingPixOrderId] = useState<string | null>(null);
  const [isManualImportOpen, setIsManualImportOpen] = useState(false);
  const [manualOrderId, setManualOrderId] = useState("");
  const [isImportingManual, setIsImportingManual] = useState(false);
  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<string | null>(null);

  const { data: orders, isLoading } = useResellerOrders(statusFilter, searchTerm);

  const handleGenerateOrPayPix = async (order: ResellerOrder) => {
    if (order.pix_qr_code) {
      setSelectedPixOrder(order);
      return;
    }

    setGeneratingPixOrderId(order.id);
    try {
      const { data, error } = await supabase.functions.invoke('ml-order-webhook', {
        body: { action: 'generate_pix_for_order', order_id: order.id },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Falha ao gerar cobrança Pix.');
      }

      await queryClient.invalidateQueries({ queryKey: ["reseller-orders"] });

      setSelectedPixOrder({
        ...order,
        pix_qr_code: data.pix_qr_code,
        pix_qr_code_base64: data.pix_qr_code_base64,
        payment_expires_at: data.payment_expires_at,
      });
    } catch (err: any) {
      toast({
        title: "Erro ao gerar Pix",
        description: err.message || "Não foi possível gerar o código Pix agora.",
        variant: "destructive",
      });
    } finally {
      setGeneratingPixOrderId(null);
    }
  };

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

  const handleCopyPix = () => {
    if (selectedPixOrder?.pix_qr_code) {
      navigator.clipboard.writeText(selectedPixOrder.pix_qr_code);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Código Pix copia e cola copiado para a área de transferência.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSyncOrders = async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("ml-order-webhook", {
        body: { action: "sync_all_recent_orders", user_id: user?.id },
      });

      if (error) {
        throw new Error(error.message || "Falha na chamada da Edge Function");
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

  // Pipeline items normalization
  const pipelineItems: OrderPipelineItem[] = useMemo(() => {
    if (!orders) return [];
    return orders.map((o) => normalizeOrderToPipelineItem(o));
  }, [orders]);

  // Existing list view
  const listViewContent = (
    <div className="space-y-6">
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
                const isMlOrder = order.payment_method === 'mercadolivre' || !!order.ml_order_id;
                const isPendingPayment = order.payment_status === 'pending' || order.status === 'pendente';

                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg text-slate-900 tracking-tight">#{order.order_number}</h3>

                          {order.ml_order_id && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-300 font-semibold text-xs px-2.5 py-0.5 gap-1.5 shadow-2xs">
                              <ShoppingBag className="h-3 w-3 text-amber-600" />
                              <span>ML: <strong>#{order.ml_order_id}</strong></span>
                            </Badge>
                          )}

                          <Badge className={statusInfo.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>

                          {(order.payment_status === "approved" || order.payment_status === "paid") && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              Pago
                            </Badge>
                          )}

                          {isPendingPayment && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-xs gap-1">
                              <Clock className="h-3 w-3" />
                              Pix Fulfillment Pendente
                            </Badge>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-primary">
                            R$ {Number(order.total_amount).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Informações centrais */}
                      <div className="py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>
                          <strong className="text-slate-700">Cliente:</strong>{" "}
                          <span className="font-medium text-slate-900">
                            {order.shipping_address?.receiver_name ||
                             order.shipping_address?.name ||
                             (order.user_id !== order.reseller_id && order.profiles ? `${order.profiles.first_name || ""} ${order.profiles.last_name || ""}`.trim() : null) ||
                             order.customer_name ||
                             (isMlOrder ? "Cliente Mercado Livre" : "Cliente")}
                          </span>
                        </div>
                        <div>
                          <strong className="text-slate-700">Data:</strong>{" "}
                          <span>
                            {format(new Date(order.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {order.shipping_address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">
                              {order.shipping_address.city}/{order.shipping_address.state}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Miniatura e Dados do Produto */}
                      {(() => {
                        const firstItem = order.order_items?.[0];
                        const itemSnapshot = firstItem?.product_snapshot || {};
                        const itemProd = firstItem?.product || {};
                        const itemThumb =
                          itemSnapshot.image_url ||
                          itemSnapshot.imageUrl ||
                          itemSnapshot.image ||
                          itemProd.image_url ||
                          itemProd.imageUrl ||
                          itemProd.images?.[0] ||
                          order.product_image;
                        const itemTitle = itemSnapshot.name || itemProd.name || order.product_name || "Produto";
                        const itemQty = firstItem?.quantity || 1;

                        return (
                          <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-slate-50 border border-slate-200">
                            <div className="relative w-12 h-12 shrink-0 rounded bg-white border overflow-hidden flex items-center justify-center">
                              {itemThumb ? (
                                <img
                                  src={itemThumb}
                                  alt={itemTitle}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Package className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                                {itemTitle}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {order.order_items && order.order_items.length > 1 ? (
                                  <span>{itemQty} un. • <strong>+{order.order_items.length - 1} outros itens</strong></span>
                                ) : (
                                  <span>{itemQty} un.</span>
                                )}
                              </p>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Informações de Envio e Etiqueta ML */}
                      {(order.tracking_code || order.ml_shipment_id || order.ml_label_url) && (
                        <div className="py-2.5 px-3 mb-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-3 flex-wrap">
                            {order.tracking_code && (
                              <span className="text-slate-700">
                                <strong>Rastreio:</strong>{" "}
                                <code className="bg-white px-1.5 py-0.5 rounded border border-slate-300 font-mono text-[11px]">
                                  {order.tracking_code}
                                </code>
                              </span>
                            )}
                            {order.ml_shipment_id && (
                              <span className="text-slate-500">
                                Remessa ML #{order.ml_shipment_id}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Ações */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t flex-wrap">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDetailOrderId(order.id)}
                            className="text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Ver Detalhes
                          </Button>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {isPendingPayment && (
                            <Button
                              size="sm"
                              onClick={() => handleGenerateOrPayPix(order)}
                              disabled={generatingPixOrderId === order.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-xs"
                            >
                              <QrCode className="h-3.5 w-3.5" />
                              {generatingPixOrderId === order.id
                                ? "Gerando..."
                                : order.pix_qr_code
                                ? "Ver Pix"
                                : "Pagar via Pix"}
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadLabel(order)}
                            disabled={downloadingLabelId === order.id}
                            className="gap-1.5 text-xs border-slate-300 hover:bg-slate-50"
                          >
                            <Download className="h-3.5 w-3.5 text-slate-600" />
                            {downloadingLabelId === order.id ? "Baixando..." : "Baixar Etiqueta"}
                          </Button>
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
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  {statusFilter !== "all"
                    ? "Não há pedidos com o status selecionado."
                    : "Você ainda não possui pedidos registrados."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  return (
    <div className="flex-1 min-h-0 h-full max-h-full flex flex-col overflow-hidden w-full space-y-1.5">
      {/* Compact Top Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Gestão de Pedidos</h1>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsManualImportOpen(true)}
            className="gap-1.5 text-xs h-7"
          >
            <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Puxar Pedido</span> ML
          </Button>

          <Button
            size="sm"
            onClick={handleSyncOrders}
            disabled={isSyncing}
            className="gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold text-xs h-7 shadow-xs"
          >
            <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
            <span className="hidden sm:inline">{isSyncing ? "Sincronizando..." : "Sincronizar ML"}</span>
          </Button>
        </div>
      </div>

      {/* Order Pipeline View (Fills remaining height) */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <OrderPipelineView
          orders={pipelineItems}
          isLoading={isLoading}
          onUpdateOrderStatus={async () => {
            toast({
              title: "Ação não permitida",
              description: "Revendedores não podem alterar o status operacional diretamente.",
              variant: "destructive",
            });
          }}
          listViewContent={listViewContent}
          userScopeLabel="Revendedor"
          onRefreshOrders={() => queryClient.invalidateQueries({ queryKey: ["reseller-orders"] })}
        />
      </div>

      {/* Modal Pix */}
      <Dialog open={!!selectedPixOrder} onOpenChange={() => setSelectedPixOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento via Pix</DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código Pix para pagar o pedido #{selectedPixOrder?.order_number}.
            </DialogDescription>
          </DialogHeader>

          {selectedPixOrder && (
            <div className="space-y-4 py-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  R$ {Number(selectedPixOrder.total_amount).toFixed(2)}
                </p>
                {selectedPixOrder.payment_expires_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Vencimento:{" "}
                    {format(new Date(selectedPixOrder.payment_expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>

              {selectedPixOrder.pix_qr_code_base64 && (
                <div className="flex justify-center p-4 bg-white rounded-lg border">
                  <img
                    src={`data:image/png;base64,${selectedPixOrder.pix_qr_code_base64}`}
                    alt="QR Code Pix"
                    className="w-48 h-48"
                  />
                </div>
              )}

              {selectedPixOrder.pix_qr_code && (
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium">Código Copia e Cola:</label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={selectedPixOrder.pix_qr_code}
                      className="text-xs font-mono select-all bg-muted"
                    />
                    <Button size="sm" onClick={handleCopyPix} className="gap-1 shrink-0">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedPixOrder(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Importar Pedido Manualmente */}
      <Dialog open={isManualImportOpen} onOpenChange={setIsManualImportOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleManualImportOrder}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-amber-600" />
                Puxar Pedido do Mercado Livre
              </DialogTitle>
              <DialogDescription>
                Informe o número do pedido da sua conta Mercado Livre para cadastrá-lo imediatamente.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Número do Pedido (Pack/Order ID do ML) *
                </label>
                <Input
                  placeholder="Ex: 2000015725821079"
                  value={manualOrderId}
                  onChange={(e) => setManualOrderId(e.target.value)}
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsManualImportOpen(false);
                  setManualOrderId("");
                }}
                disabled={isImportingManual}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isImportingManual || !manualOrderId.trim()}
                className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold"
              >
                {isImportingManual ? "Importando..." : "Importar Pedido"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Shared OrderDetailsModal */}
      {selectedDetailOrderId && (
        <OrderDetailsModal
          orderId={selectedDetailOrderId}
          isOpen={!!selectedDetailOrderId}
          onClose={() => setSelectedDetailOrderId(null)}
        />
      )}
    </div>
  );
}

export default ResellerOrders;
