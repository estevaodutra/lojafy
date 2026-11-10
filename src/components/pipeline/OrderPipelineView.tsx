import React, { useState, useMemo } from "react";
import { OrderPipelineItem, PipelineType } from "@/types/orderPipeline";
import { OrderKanbanBoard } from "./OrderKanbanBoard";
import { OrderPipelineListView } from "./OrderPipelineListView";
import { PipelineConfigDialog } from "./PipelineConfigDialog";
import { ArchiveOrderDialog } from "./ArchiveOrderDialog";
import { BatchArchiveDialog } from "./BatchArchiveDialog";
import { useOrderPipelines } from "@/hooks/useOrderPipelines";
import { useUserRole } from "@/hooks/useUserRole";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Search,
  Settings2,
  Package,
  QrCode,
  Copy,
  Check,
  RotateCcw,
  Archive,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrderPipelineViewProps {
  orders: OrderPipelineItem[];
  isLoading?: boolean;
  onUpdateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  listViewContent?: React.ReactNode;
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
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);

  // Modals
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [archiveModalOrder, setArchiveModalOrder] = useState<OrderPipelineItem | null>(null);

  // Pix modal state
  const [pixModalOrder, setPixModalOrder] = useState<OrderPipelineItem | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [isGeneratingPix, setIsGeneratingPix] = useState(false);

  // Active pipeline object
  const activePipeline = useMemo(() => {
    return pipelines.find((p) => p.key === activePipelineKey) || pipelines[0];
  }, [pipelines, activePipelineKey]);

  // Sellers list for filters
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
      // Archiving condition (Section 7 & 11)
      if (showArchivedOnly) {
        if (!order.is_archived) return false;
      } else {
        if (order.is_archived) return false; // Default: hide archived orders from active operational pipeline
      }

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

  // Label sync state
  const [isSyncingLabels, setIsSyncingLabels] = useState(false);

  const handleSyncPendingLabels = async () => {
    try {
      setIsSyncingLabels(true);
      toast.info("Consultando o Mercado Livre para verificar etiquetas liberadas...");

      const { data, error } = await supabase.functions.invoke("ml-order-webhook", {
        body: { action: "sync_pending_labels" },
      });

      if (error) {
        throw error;
      }

      const res = data?.result;
      if (res?.downloaded > 0) {
        toast.success(
          `Sucesso! ${res.downloaded} nova(s) etiqueta(s) baixada(s) e vinculada(s) aos pedidos.`
        );
      } else if (res?.checked > 0) {
        toast.info(
          `${res.checked} pedido(s) checado(s). Nenhuma nova etiqueta pronta para impressão no Mercado Livre no momento.`
        );
      } else {
        toast.info("Todos os pedidos ativos já possuem etiquetas vinculadas.");
      }

      onRefreshOrders?.();
    } catch (err: any) {
      console.error("Erro ao sincronizar etiquetas:", err);
      toast.error(err.message || "Erro ao consultar etiquetas no Mercado Livre.");
    } finally {
      setIsSyncingLabels(false);
    }
  };

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
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden space-y-1.5">
      {/* Linha 1: Barra de Ações Compacta */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-1.5 px-2.5 rounded-lg border bg-card/90 shadow-2xs shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Visualizer Switcher: [ Pipeline ] [ Lista ] */}
          <div className="flex items-center rounded-md bg-muted p-0.5 border">
            <Button
              variant={viewMode === "pipeline" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2.5 text-[11px] font-semibold gap-1 shadow-none"
              onClick={() => setViewMode("pipeline")}
            >
              <LayoutGrid className="w-3 h-3" />
              Pipeline
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2.5 text-[11px] font-semibold gap-1 shadow-none"
              onClick={() => setViewMode("list")}
            >
              <List className="w-3 h-3" />
              Lista
            </Button>
          </div>

          {/* Sub-Pipelines Selector (available in both Pipeline and List views) */}
          <div className="flex items-center rounded-md bg-muted/60 p-0.5 border">
            <Button
              variant={activePipelineKey === "primary" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[11px] font-medium gap-1"
              onClick={() => setActivePipelineKey("primary")}
            >
              <Package className="w-3 h-3 text-primary" />
              Principal
            </Button>
            <Button
              variant={activePipelineKey === "occurrences" ? "secondary" : "ghost"}
              size="sm"
              className="h-6 px-2 text-[11px] font-medium gap-1"
              onClick={() => setActivePipelineKey("occurrences")}
            >
              <RotateCcw className="w-3 h-3 text-amber-500" />
              Retornos / Ocorrências
            </Button>
          </div>
        </div>

        {/* Right side: Count & Super Admin Settings */}
        <div className="flex items-center gap-1.5">
          {userScopeLabel && (
            <Badge variant="outline" className="text-[10px] font-normal py-0 h-5">
              {userScopeLabel}
            </Badge>
          )}

          <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0 h-5">
            {filteredOrders.length} pedido(s)
          </Badge>

          {isSuperAdmin() && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px] px-2 gap-1 border-dashed hover:border-primary"
              onClick={() => setIsConfigOpen(true)}
            >
              <Settings2 className="w-3 h-3 text-primary" />
              <span>Configurar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Linha 2: Barra de Filtros Compacta */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 px-2.5 rounded-lg border bg-muted/30 shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar por #pedido, rastreio, cliente ou produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-7 text-xs bg-background"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          )}
        </div>

        {/* Marketplace Filter */}
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="w-[140px] h-7 text-xs bg-background">
            <SelectValue placeholder="Canal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos canais</SelectItem>
            <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
            <SelectItem value="shopee">Shopee</SelectItem>
            <SelectItem value="lojafy">Lojafy / Loja</SelectItem>
            <SelectItem value="manual">Manual</SelectItem>
          </SelectContent>
        </Select>

        {/* Seller Filter */}
        {uniqueSellers.length > 0 && (
          <Select value={selectedSeller} onValueChange={setSelectedSeller}>
            <SelectTrigger className="w-[150px] h-7 text-xs bg-background">
              <SelectValue placeholder="Seller" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos sellers</SelectItem>
              {uniqueSellers.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Sync ML Pending Labels Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2.5 gap-1.5 border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 shrink-0"
          onClick={handleSyncPendingLabels}
          disabled={isSyncingLabels}
          title="Verificar se etiquetas pendentes foram liberadas pelo Mercado Livre"
        >
          {isSyncingLabels ? (
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          ) : (
            <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          )}
          <span>{isSyncingLabels ? "Verificando ML..." : "Sincronizar Etiquetas ML"}</span>
        </Button>

        {/* Archived Quick Filter Toggle (Section 11) */}
        <Button
          variant={showArchivedOnly ? "default" : "outline"}
          size="sm"
          className={cn(
            "h-7 text-xs px-2.5 gap-1 shrink-0",
            showArchivedOnly
              ? "bg-slate-800 hover:bg-slate-900 text-white"
              : "text-muted-foreground hover:text-foreground"
          )}
          onClick={() => setShowArchivedOnly(!showArchivedOnly)}
        >
          <Archive className="w-3 h-3" />
          {showArchivedOnly ? "Exibindo Arquivados" : "Ver Arquivados"}
        </Button>

        {/* Reset Filters */}
        {(searchTerm || channelFilter !== "all" || selectedSeller !== "all" || showArchivedOnly) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSearchTerm("");
              setChannelFilter("all");
              setSelectedSeller("all");
              setShowArchivedOnly(false);
            }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Main Content Area (Fills remaining height) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden flex flex-col">
        {viewMode === "pipeline" ? (
          isLoading || isLoadingPipelines ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Carregando pipeline operacional...</p>
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
              onArchiveOrder={(item) => setArchiveModalOrder(item)}
            />
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma pipeline configurada.
            </div>
          )
        ) : (
          /* List View: Full-featured table with complete card parity */
          isLoading || isLoadingPipelines ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs">Carregando lista operacional...</p>
            </div>
          ) : activePipeline ? (
            <OrderPipelineListView
              orders={filteredOrders}
              pipeline={activePipeline}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onViewDetails={(item) => setSelectedOrderId(item.id)}
              onGeneratePix={handleGeneratePix}
              onPrintLabel={handlePrintLabel}
              onGenerateLabel={(item) => setSelectedOrderId(item.id)}
              onArchiveOrder={(item) => setArchiveModalOrder(item)}
              onRefreshOrders={onRefreshOrders}
            />
          ) : listViewContent ? (
            <div className="flex-1 min-h-0 overflow-y-auto w-full pr-0 scrollbar-none">
              {listViewContent}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma pipeline configurada.
            </div>
          )
        )}
      </div>

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
                <p className="text-xs text-muted-foreground">
                  {pixModalOrder.is_marketplace
                    ? "Valor a pagar (Custo Fornecedor / Fulfillment)"
                    : "Valor a pagar"}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(pixModalOrder.supplier_cost || pixModalOrder.total_amount)}
                </p>
                {pixModalOrder.is_marketplace && pixModalOrder.profit_amount > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Venda:{" "}
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(pixModalOrder.sale_amount || pixModalOrder.total_amount)}{" "}
                    • Lucro estimado:{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      +
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(pixModalOrder.profit_amount)}
                    </strong>
                  </p>
                )}
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

      {/* Manual Archive Dialog */}
      <ArchiveOrderDialog
        order={archiveModalOrder}
        isOpen={!!archiveModalOrder}
        onClose={() => setArchiveModalOrder(null)}
        onSuccess={() => {
          setArchiveModalOrder(null);
          onRefreshOrders?.();
        }}
      />
    </div>
  );
};
