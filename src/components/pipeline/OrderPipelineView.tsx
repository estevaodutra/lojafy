import React, { useState, useMemo } from "react";
import { OrderPipelineItem, PipelineType } from "@/types/orderPipeline";
import { OrderKanbanBoard } from "./OrderKanbanBoard";
import { PipelineConfigDialog } from "./PipelineConfigDialog";
import { useOrderPipelines } from "@/hooks/useOrderPipelines";
import { useUserRole } from "@/hooks/useUserRole";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LayoutGrid,
  List,
  SlidersHorizontal,
  Search,
  Filter,
  Settings2,
  Package,
  QrCode,
  Copy,
  Check,
  AlertCircle,
  Truck,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrderPipelineViewProps {
  orders: OrderPipelineItem[];
  isLoading?: boolean;
  onUpdateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  listViewContent: React.ReactNode;
  userScopeLabel?: string;
  onRefreshOrders?: () => void;
}

export const OrderPipelineView: React.FC<OrderPipelineViewProps> = ({
  orders,
  isLoading = false,
  onUpdateOrderStatus,
  listViewContent,
  userScopeLabel,
  onRefreshOrders,
}) => {
  const { isSuperAdmin } = useUserRole();
  const { pipelines, isLoading: isLoadingPipelines } = useOrderPipelines();

  // Primary toggle: [ Pipeline ] [ Lista ]
  const [viewMode, setViewMode] = useState<"pipeline" | "list">("pipeline");

  // Sub-pipeline toggle: 'primary' | 'occurrences'
  const [activePipelineKey, setActivePipelineKey] = useState<PipelineType>("primary");

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [selectedSeller, setSelectedSeller] = useState("all");

  // Modals
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Pix modal state
  const [pixModalOrder, setPixModalOrder] = useState<OrderPipelineItem | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);

  // Active pipeline object
  const activePipeline = useMemo(() => {
    return pipelines.find((p) => p.key === activePipelineKey) || pipelines[0];
  }, [pipelines, activePipelineKey]);

  // Sellers and channels list for filters
  const uniqueSellers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.seller_name && o.seller_name !== "Lojafy") {
        set.add(o.seller_name);
      }
    });
    return Array.from(set);
  }, [orders]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesNum = order.order_number.toLowerCase().includes(term);
        const matchesExt = order.external_reference?.toLowerCase().includes(term);
        const matchesTrack = order.tracking_number?.toLowerCase().includes(term);
        const matchesCustomer = order.customer_name.toLowerCase().includes(term);
        const matchesProd = order.main_product?.name.toLowerCase().includes(term);
        if (!matchesNum && !matchesExt && !matchesTrack && !matchesCustomer && !matchesProd) {
          return false;
        }
      }

      // Channel
      if (channelFilter !== "all" && order.channel !== channelFilter) {
        return false;
      }

      // Seller
      if (selectedSeller !== "all" && order.seller_name !== selectedSeller) {
        return false;
      }

      return true;
    });
  }, [orders, searchTerm, channelFilter, selectedSeller]);

  // Pix generation handler
  const handleGeneratePix = async (order: OrderPipelineItem) => {
    if (order.pix_qr_code) {
      setPixModalOrder(order);
      return;
    }

    setIsGeneratingPix(true);
    toast.info(`Gerando cobrança Pix para o pedido #${order.order_number}...`);
    try {
      const { data, error } = await supabase.functions.invoke("ml-order-webhook", {
        body: { action: "generate_pix_for_order", order_id: order.id },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Falha ao gerar cobrança Pix.");
      }

      const updated: OrderPipelineItem = {
        ...order,
        pix_qr_code: data.pix_qr_code,
        pix_qr_code_base64: data.pix_qr_code_base64,
        payment_expires_at: data.payment_expires_at,
      };

      setPixModalOrder(updated);
      onRefreshOrders?.();
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar código Pix.");
    } finally {
      setIsGeneratingPix(false);
    }
  };

  // Label print handler
  const handlePrintLabel = (order: OrderPipelineItem) => {
    if (order.ml_label_url) {
      window.open(order.ml_label_url, "_blank");
      toast.success(`Abrindo etiqueta do pedido #${order.order_number}...`);
    } else {
      setSelectedOrderId(order.id);
    }
  };

  const copyPixCode = () => {
    if (!pixModalOrder?.pix_qr_code) return;
    navigator.clipboard.writeText(pixModalOrder.pix_qr_code);
    setPixCopied(true);
    toast.success("Código Pix copiado!");
    setTimeout(() => setPixCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-4">
      {/* Top Bar: View Mode Switcher [ Pipeline ] [ Lista ] & Sub-pipelines */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-xl border shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Main Visualizer Switcher */}
          <div className="flex items-center rounded-lg bg-muted p-1 border">
            <Button
              variant={viewMode === "pipeline" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-none"
              onClick={() => setViewMode("pipeline")}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Pipeline
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-8 px-3 text-xs font-semibold gap-1.5 shadow-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-3.5 h-3.5" />
              Lista
            </Button>
          </div>

          {/* Sub-Pipelines Selector (when in Pipeline view) */}
          {viewMode === "pipeline" && (
            <div className="flex items-center rounded-lg bg-muted/60 p-1 border">
              <Button
                variant={activePipelineKey === "primary" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs font-medium gap-1"
                onClick={() => setActivePipelineKey("primary")}
              >
                <Package className="w-3.5 h-3.5 text-primary" />
                Pipeline Principal
              </Button>
              <Button
                variant={activePipelineKey === "occurrences" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 px-2.5 text-xs font-medium gap-1"
                onClick={() => setActivePipelineKey("occurrences")}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                Retornos e Ocorrências
              </Button>
            </div>
          )}
        </div>

        {/* Right side: Count Badge & Super Admin Settings */}
        <div className="flex items-center gap-2">
          {userScopeLabel && (
            <Badge variant="outline" className="text-xs font-normal">
              {userScopeLabel}
            </Badge>
          )}

          <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1">
            {filteredOrders.length} pedido(s)
          </Badge>

          {isSuperAdmin() && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-dashed hover:border-primary"
              onClick={() => setIsConfigOpen(true)}
            >
              <Settings2 className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Configurar Pipelines</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-none border bg-card/50">
        <CardContent className="p-3">
          <div className="flex flex-col md:flex-row gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por #pedido, rastreio, cliente ou produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Marketplace Filter */}
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-full md:w-[160px] h-9 text-xs">
                <SelectValue placeholder="Canal / Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os canais</SelectItem>
                <SelectItem value="mercadolivre">Mercado Livre (ML)</SelectItem>
                <SelectItem value="shopee">Shopee</SelectItem>
                <SelectItem value="lojafy">Lojafy / Loja</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            {/* Seller Filter if multi-seller */}
            {uniqueSellers.length > 0 && (
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger className="w-full md:w-[170px] h-9 text-xs">
                  <SelectValue placeholder="Filtrar por Seller" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os sellers</SelectItem>
                  {uniqueSellers.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Reset Filters */}
            {(searchTerm || channelFilter !== "all" || selectedSeller !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setSearchTerm("");
                  setChannelFilter("all");
                  setSelectedSeller("all");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content Area */}
      {viewMode === "pipeline" ? (
        <div className="w-full">
          {isLoading || isLoadingPipelines ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm">Carregando pipeline operacional...</p>
            </div>
          ) : activePipeline ? (
            <OrderKanbanBoard
              pipeline={activePipeline}
              orders={filteredOrders}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onViewDetails={(item) => setSelectedOrderId(item.id)}
              onGeneratePix={handleGeneratePix}
              onPrintLabel={handlePrintLabel}
              onGenerateLabel={(item) => setSelectedOrderId(item.id)}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma pipeline configurada.
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="w-full">{listViewContent}</div>
      )}

      {/* Order Details Modal (Shared) */}
      {selectedOrderId && (
        <OrderDetailsModal
          orderId={selectedOrderId}
          isOpen={!!selectedOrderId}
          onClose={() => {
            setSelectedOrderId(null);
            onRefreshOrders?.();
          }}
        />
      )}

      {/* Super Admin Pipeline Config Dialog */}
      <PipelineConfigDialog
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />

      {/* Pix Payment Dialog */}
      <Dialog open={!!pixModalOrder} onOpenChange={() => setPixModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Cobrança Pix — Pedido #{pixModalOrder?.order_number}
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie a chave Pix para realizar o pagamento.
            </DialogDescription>
          </DialogHeader>

          {pixModalOrder && (
            <div className="flex flex-col items-center space-y-4 py-2">
              {pixModalOrder.pix_qr_code_base64 ? (
                <div className="p-3 bg-white rounded-xl shadow-xs border">
                  <img
                    src={`data:image/png;base64,${pixModalOrder.pix_qr_code_base64}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              ) : null}

              <div className="text-center">
                <p className="text-xs text-muted-foreground">Valor a pagar</p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(pixModalOrder.total_amount)}
                </p>
              </div>

              {pixModalOrder.pix_qr_code && (
                <div className="w-full space-y-2">
                  <p className="text-xs font-medium text-foreground">Código Copia e Cola:</p>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={pixModalOrder.pix_qr_code}
                      className="text-xs font-mono select-all bg-muted"
                    />
                    <Button size="sm" onClick={copyPixCode} className="gap-1 shrink-0">
                      {pixCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {pixCopied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
