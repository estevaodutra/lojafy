import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useResellerOrders, type ResellerOrder } from "@/hooks/useResellerOrders";
import { Search, Package, Download, MapPin, AlertCircle, QrCode, Copy, Check, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig, type OrderStatus } from "@/constants/orderStatus";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

async function downloadLabel(orderId: string, orderNumber: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const url = `${supabaseUrl}/functions/v1/ml-get-label?order_id=${orderId}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!res.ok) {
    console.error('Failed to download label:', res.status);
    return;
  }

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `etiqueta-${orderNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function ResellerOrders() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPixOrder, setSelectedPixOrder] = useState<ResellerOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const { data: orders, isLoading } = useResellerOrders(statusFilter, searchTerm);

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
      <div>
        <h1 className="text-3xl font-bold">Gestão de Pedidos</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe todos os pedidos da sua loja
        </p>
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
                          {order.ml_shipment_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1"
                              onClick={() => downloadLabel(order.id, order.order_number)}
                            >
                              <Download className="h-3 w-3" />
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
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Tente buscar com outros termos"
                    : "Os pedidos da sua loja aparecerão aqui"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

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
