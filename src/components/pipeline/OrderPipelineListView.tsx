import React, { useState, useMemo } from "react";
import {
  OrderPipelineItem,
  OrderPipeline,
  OrderPipelineStage,
} from "@/types/orderPipeline";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { BatchArchiveDialog } from "./BatchArchiveDialog";
import {
  Eye,
  Link2,
  Truck,
  Check,
  QrCode,
  Printer,
  FileText,
  Package,
  Clock,
  Archive,
  MoreHorizontal,
  ArrowUpDown,
  ChevronRight,
  ChevronDown,
  Copy,
  RotateCcw,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export type OrderListSortOption =
  | "oldest_first"
  | "newest_first"
  | "longest_time_in_stage"
  | "shortest_time_in_stage"
  | "highest_value"
  | "lowest_value";

interface OrderPipelineListViewProps {
  orders: OrderPipelineItem[];
  pipeline: OrderPipeline;
  onUpdateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  onArchiveOrder?: (order: OrderPipelineItem) => void;
  onRefreshOrders?: () => void;
}

export const OrderPipelineListView: React.FC<OrderPipelineListViewProps> = ({
  orders,
  pipeline,
  onUpdateOrderStatus,
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
  onArchiveOrder,
  onRefreshOrders,
}) => {
  // 1. Sorting State (Default: newest_first)
  const [sortOption, setSortOption] = useState<OrderListSortOption>("newest_first");

  // 2. Selection & Batch Actions State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchArchiveOpen, setIsBatchArchiveOpen] = useState(false);
  const [isBatchMoveOpen, setIsBatchMoveOpen] = useState(false);
  const [batchTargetStage, setBatchTargetStage] = useState<string>("");
  const [isMovingBatch, setIsMovingBatch] = useState(false);

  // 3. Mobile Expanded Rows
  const [expandedMobileIds, setExpandedMobileIds] = useState<string[]>([]);

  // 4. Pagination State
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Helper map for stage lookup
  const stageMap = useMemo(() => {
    const map = new Map<string, OrderPipelineStage>();
    pipeline.stages.forEach((st) => {
      map.set(st.status_key, st);
      map.set(st.name.toLowerCase(), st);
      map.set(st.id, st);
    });
    return map;
  }, [pipeline.stages]);

  // Apply sorting strictly to the full dataset
  const sortedOrders = useMemo(() => {
    const list = [...orders];

    return list.sort((a, b) => {
      switch (sortOption) {
        case "oldest_first":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();

        case "newest_first":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

        case "longest_time_in_stage": {
          const timeA = a.stage_entered_at
            ? new Date(a.stage_entered_at).getTime()
            : new Date(a.created_at).getTime();
          const timeB = b.stage_entered_at
            ? new Date(b.stage_entered_at).getTime()
            : new Date(b.created_at).getTime();
          // Lower timestamp = entered earlier = longest time in stage
          return timeA - timeB;
        }

        case "shortest_time_in_stage": {
          const timeA = a.stage_entered_at
            ? new Date(a.stage_entered_at).getTime()
            : new Date(a.created_at).getTime();
          const timeB = b.stage_entered_at
            ? new Date(b.stage_entered_at).getTime()
            : new Date(b.created_at).getTime();
          return timeB - timeA;
        }

        case "highest_value":
          return (b.total_amount || 0) - (a.total_amount || 0);

        case "lowest_value":
          return (a.total_amount || 0) - (b.total_amount || 0);

        default:
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
    });
  }, [orders, sortOption]);

  // Paginated slice
  const totalPages = Math.ceil(sortedOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  // Selection handlers
  const isAllPageSelected =
    paginatedOrders.length > 0 &&
    paginatedOrders.every((o) => selectedIds.includes(o.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      const pageIdSet = new Set(paginatedOrders.map((o) => o.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIdSet.has(id)));
    } else {
      const combined = new Set([...selectedIds, ...paginatedOrders.map((o) => o.id)]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedOrdersList = useMemo(() => {
    return orders.filter((o) => selectedIds.includes(o.id));
  }, [orders, selectedIds]);

  // Mobile expansion toggle
  const toggleMobileRow = (id: string) => {
    setExpandedMobileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Batch Move Stages Execution
  const handleExecuteBatchMove = async () => {
    if (!batchTargetStage) {
      toast.error("Selecione a etapa de destino.");
      return;
    }

    setIsMovingBatch(true);
    let successCount = 0;
    let failCount = 0;

    for (const order of selectedOrdersList) {
      try {
        await onUpdateOrderStatus(order.id, batchTargetStage);
        successCount++;
      } catch (err) {
        console.error(`Erro ao mover pedido #${order.order_number}:`, err);
        failCount++;
      }
    }

    setIsMovingBatch(false);
    setIsBatchMoveOpen(false);
    setSelectedIds([]);

    if (failCount === 0) {
      toast.success(
        `Sucesso: ${successCount} pedido(s) movido(s) para a etapa selecionada.`
      );
    } else {
      toast.warning(
        `Movimentação parcial: ${successCount} concluído(s) e ${failCount} com falha.`
      );
    }

    onRefreshOrders?.();
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiado!`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-full flex-1 flex flex-col min-h-0 space-y-2">
        {/* Top Controls Bar: Sort, Density & Batch Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg border bg-card/80 shadow-2xs shrink-0">
          {/* Left: Sorting & Page Info */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium text-foreground">Ordenar por:</span>
            </div>

            <Select
              value={sortOption}
              onValueChange={(val) => {
                setSortOption(val as OrderListSortOption);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[195px] h-7 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest_first" className="text-xs">
                  Mais recentes primeiro
                </SelectItem>
                <SelectItem value="oldest_first" className="text-xs">
                  Mais antigos primeiro
                </SelectItem>
                <SelectItem value="longest_time_in_stage" className="text-xs">
                  Maior tempo na etapa
                </SelectItem>
                <SelectItem value="shortest_time_in_stage" className="text-xs">
                  Menor tempo na etapa
                </SelectItem>
                <SelectItem value="highest_value" className="text-xs">
                  Maior valor
                </SelectItem>
                <SelectItem value="lowest_value" className="text-xs">
                  Menor valor
                </SelectItem>
              </SelectContent>
            </Select>

            <span className="text-[11px] text-muted-foreground pl-1">
              Mostrando {sortedOrders.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, sortedOrders.length)} de{" "}
              {sortedOrders.length} pedido(s)
            </span>
          </div>

          {/* Right: Page Size & Batch Trigger */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <span>Linhas:</span>
              <Select
                value={String(pageSize)}
                onValueChange={(val) => {
                  setPageSize(Number(val));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[65px] h-7 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20" className="text-xs">20</SelectItem>
                  <SelectItem value="50" className="text-xs">50</SelectItem>
                  <SelectItem value="100" className="text-xs">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Batch Action Bar (Displayed prominently when rows are selected) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between p-2 px-3 rounded-lg border border-primary/30 bg-primary/5 text-primary text-xs shadow-2xs shrink-0 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary">
                {selectedIds.length} pedido(s) selecionado(s)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/30 bg-background text-foreground hover:bg-primary/10"
                onClick={() => {
                  if (pipeline.stages.length > 0) {
                    setBatchTargetStage(pipeline.stages[0].status_key);
                  }
                  setIsBatchMoveOpen(true);
                }}
              >
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                Mover Etapa em Massa
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-amber-500/30 bg-background text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                onClick={() => setIsBatchArchiveOpen(true)}
              >
                <Archive className="w-3.5 h-3.5" />
                Arquivar Selecionados
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedIds([])}
              >
                Limpar Seleção
              </Button>
            </div>
          </div>
        )}

        {/* Desktop Table View (Hidden on small mobile screens) */}
        <div className="hidden md:flex flex-1 min-h-0 w-full overflow-hidden border rounded-lg bg-card shadow-2xs">
          <div className="w-full h-full overflow-auto scrollbar-thin">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10 border-b shadow-2xs">
                <TableRow className="text-xs hover:bg-transparent">
                  <TableHead className="w-10 py-2.5 px-3 text-center">
                    <Checkbox
                      checked={isAllPageSelected}
                      onCheckedChange={toggleSelectAllPage}
                      aria-label="Selecionar todos os pedidos da página"
                    />
                  </TableHead>
                  <TableHead className="w-[170px] py-2.5">Pedido</TableHead>
                  <TableHead className="min-w-[220px] py-2.5">Produto</TableHead>
                  <TableHead className="w-[200px] py-2.5">Operação</TableHead>
                  <TableHead className="w-[180px] py-2.5">Status</TableHead>
                  <TableHead className="w-[110px] py-2.5 text-right">Total</TableHead>
                  <TableHead className="w-[190px] py-2.5 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {paginatedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-xs text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="w-8 h-8 text-muted-foreground/40 stroke-1" />
                        <p className="font-medium">Nenhum pedido encontrado nesta visualização</p>
                        <p className="text-[11px] text-muted-foreground">
                          Tente ajustar seus termos de busca ou filtros operacionais.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedOrders.map((order) => {
                    const isSelected = selectedIds.includes(order.id);
                    const isPaid =
                      order.payment_status === "paid" ||
                      ["pago", "recebido", "embalado", "enviado", "finalizado"].includes(
                        order.status
                      );
                    const hasLabel =
                      order.has_shipping_file ||
                      !!order.ml_label_url ||
                      order.shipping_label_status === "ready";

                    // Stage info
                    const stage =
                      stageMap.get(order.status) ||
                      stageMap.get(order.status.toLowerCase());
                    const stageLabel = stage?.name || order.status;

                    const formattedAmount = new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(order.total_amount || 0);

                    return (
                      <TableRow
                        key={order.id}
                        className={cn(
                          "text-xs transition-colors hover:bg-muted/40",
                          isSelected && "bg-primary/5"
                        )}
                      >
                        {/* 1. SELEÇÃO */}
                        <TableCell className="py-2.5 px-3 text-center align-middle">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectRow(order.id)}
                            aria-label={`Selecionar pedido #${order.order_number}`}
                          />
                        </TableCell>

                        {/* 2. PEDIDO:
                            Linha 1: #467 (com badge ML se existir)
                            Linha 2: Rastreamento (ou external ref)
                            Linha 3: Canal (OTHER, ML, etc.) + Origem (AUTO / MANUAL)
                        */}
                        <TableCell className="py-2.5 align-middle">
                          <div className="space-y-1">
                            {/* Linha 1 */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className="font-bold text-sm tracking-tight text-foreground hover:text-primary cursor-pointer"
                                onClick={() => onViewDetails(order)}
                                title="Abrir detalhes do pedido"
                              >
                                #{order.order_number}
                              </span>
                              {order.ml_order_id && (
                                <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                                  ML: #{order.ml_order_id}
                                </span>
                              )}
                            </div>

                            {/* Linha 2 — Rastreamento */}
                            {order.tracking_number ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[155px]"
                                    onClick={() =>
                                      copyToClipboard(
                                        order.tracking_number!,
                                        "Código de rastreio"
                                      )
                                    }
                                  >
                                    <Truck className="w-3 h-3 text-blue-500 shrink-0" />
                                    <span className="truncate">{order.tracking_number}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">
                                    Rastreio: {order.tracking_number} (clique para copiar)
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : order.external_reference ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground hover:text-foreground cursor-pointer truncate max-w-[155px]"
                                    onClick={() =>
                                      copyToClipboard(
                                        order.external_reference!,
                                        "Referência externa"
                                      )
                                    }
                                  >
                                    <Link2 className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <span className="truncate">
                                      {order.external_reference}
                                    </span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs">
                                    Ref: {order.external_reference}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <div className="text-[10px] text-muted-foreground italic">
                                Sem rastreio
                              </div>
                            )}

                            {/* Linha 3 — Plataforma / Origem */}
                            <div className="flex items-center gap-1 pt-0.5">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1 py-0 font-semibold uppercase tracking-wider",
                                  order.channel === "mercadolivre"
                                    ? "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800"
                                    : order.channel === "shopee"
                                    ? "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                                    : "bg-muted text-muted-foreground"
                                )}
                              >
                                {order.channel_label || "OTHER"}
                              </Badge>

                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-[9px] px-1 py-0 font-semibold tracking-wider",
                                  order.origin_type === "AUTO"
                                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                                )}
                              >
                                {order.origin_type || "AUTO"}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        {/* 3. PRODUTO:
                            Miniatura à esquerda + Nome (até 2 linhas) + Quantidade (+X outros)
                        */}
                        <TableCell className="py-2.5 align-middle">
                          <div className="flex items-center gap-2.5">
                            <div className="relative w-11 h-11 shrink-0 rounded bg-muted/50 border overflow-hidden flex items-center justify-center">
                              {order.main_product?.imageUrl ? (
                                <img
                                  src={order.main_product.imageUrl}
                                  alt={order.main_product.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : (
                                <Package className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p
                                className="text-xs font-medium text-foreground line-clamp-2 leading-tight cursor-pointer hover:text-primary"
                                onClick={() => onViewDetails(order)}
                                title={order.main_product?.name || "Produto"}
                              >
                                {order.main_product?.name || "Produto sem descrição"}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {order.total_items_count > 1 ? (
                                  <span>
                                    {order.main_product?.quantity || 1} un. •{" "}
                                    <strong className="text-foreground font-semibold">
                                      +{order.total_items_count - 1} outros
                                    </strong>{" "}
                                    ({order.total_quantity_count} un. totais)
                                  </span>
                                ) : (
                                  <span>{order.main_product?.quantity || 1} un.</span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        {/* 4. OPERAÇÃO:
                            Seller, Cliente, Fornecedor e Destino verticalmente
                        */}
                        <TableCell className="py-2.5 align-middle">
                          <div className="space-y-0.5 text-xs">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground w-16 shrink-0">Seller:</span>
                              <span
                                className="font-medium text-foreground truncate max-w-[130px]"
                                title={order.seller_name}
                              >
                                {order.seller_name || "Lojafy"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground w-16 shrink-0">Cliente:</span>
                              <span
                                className="font-medium text-foreground truncate max-w-[130px]"
                                title={order.customer_name}
                              >
                                {order.customer_name || "Cliente"}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="text-muted-foreground w-16 shrink-0">Fornecedor:</span>
                              <span
                                className="font-medium text-foreground truncate max-w-[130px]"
                                title={order.supplier_name}
                              >
                                {order.supplier_name || "Prosperous"}
                              </span>
                            </div>

                            {(order.customer_city || order.customer_state) && (
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                <span className="text-muted-foreground/80 w-16 shrink-0">Destino:</span>
                                <span className="truncate max-w-[130px]">
                                  {[order.customer_city, order.customer_state]
                                    .filter(Boolean)
                                    .join(" / ")}
                                </span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* 5. STATUS:
                            Etapa do Kanban + Tempo na etapa + Alerta de ocorrência
                        */}
                        <TableCell className="py-2.5 align-middle">
                          <div className="space-y-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-[11px] px-2 py-0.5 font-semibold border shadow-2xs whitespace-normal text-left inline-block",
                                stage?.color_class ||
                                  "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/60 dark:text-slate-300"
                              )}
                            >
                              {stageLabel}
                            </Badge>

                            {order.active_ticket_status && (
                              <Badge
                                variant="destructive"
                                className="text-[9px] px-1.5 py-0 block w-fit"
                              >
                                Ocorrência: {order.active_ticket_status}
                              </Badge>
                            )}

                            {order.time_in_stage_display && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium pt-0.5">
                                <Clock className="w-3 h-3 text-muted-foreground/80 shrink-0" />
                                <span>{order.time_in_stage_display}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>

                        {/* 6. TOTAL:
                            Custo de Fulfillment (a pagar) vs Venda Externa vs Lucro
                        */}
                        <TableCell className="py-2.5 align-middle text-right">
                          {order.is_marketplace ? (
                            <div className="space-y-0.5 inline-flex flex-col items-end">
                              {/* Custo Real a Pagar via Pix */}
                              <div className="flex items-baseline gap-1 justify-end">
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  {isPaid ? "Custo:" : "A Pagar:"}
                                </span>
                                <span className="text-sm font-bold text-foreground tracking-tight">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(order.supplier_cost || 0)}
                                </span>
                              </div>

                              {/* Venda e Lucro */}
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground justify-end">
                                <span>
                                  Venda:{" "}
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(order.sale_amount || order.total_amount || 0)}
                                </span>
                                {order.profit_amount > 0 && (
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                                    +{new Intl.NumberFormat("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    }).format(order.profit_amount)}
                                  </span>
                                )}
                              </div>

                              {/* Status do Pagamento */}
                              <div className="pt-0.5">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                    <Check className="w-3 h-3 stroke-[2.5]" />
                                    Pago
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                    Pix Pendente
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <span className="text-sm font-bold text-foreground tracking-tight block">
                                {formattedAmount}
                              </span>
                              {isPaid ? (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  <Check className="w-3 h-3 stroke-[2.5]" />
                                  Pago
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  Pix Pendente
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* 7. AÇÕES (Paridade Completa com o Card) */}
                        <TableCell className="py-2.5 align-middle text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* 1. Ver Detalhes */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0 shrink-0 hover:bg-accent hover:text-accent-foreground"
                                  onClick={() => onViewDetails(order)}
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Ver detalhes do pedido</p>
                              </TooltipContent>
                            </Tooltip>

                            {/* 2. Pix Action */}
                            {isPaid ? (
                              <Badge
                                variant="default"
                                className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-600 text-white font-medium gap-1 pointer-events-none select-none shadow-none"
                              >
                                <Check className="w-3 h-3 stroke-[2.5]" />
                                <span>Pago ✓</span>
                              </Badge>
                            ) : (
                              <Button
                                variant="secondary"
                                size="sm"
                                className="h-7 px-2 text-[10px] font-medium gap-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20"
                                onClick={() => onGeneratePix?.(order)}
                              >
                                <QrCode className="w-3 h-3" />
                                <span>Gerar Pix</span>
                              </Button>
                            )}

                            {/* 3. Etiqueta Action */}
                            {hasLabel ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px] font-medium gap-1 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                                onClick={() => onPrintLabel?.(order)}
                              >
                                <Printer className="w-3 h-3" />
                                <span>Imprimir</span>
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-[10px] font-medium gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  onGenerateLabel
                                    ? onGenerateLabel(order)
                                    : onViewDetails(order)
                                }
                              >
                                <FileText className="w-3 h-3" />
                                <span>Etiqueta</span>
                              </Button>
                            )}

                            {/* 4. Menu Contextual de 3 Pontos (Ações Secundárias e Mover Etapa) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                  Pedido #{order.order_number}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />

                                {/* Submenu para Mover Etapa */}
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger className="text-xs gap-1.5">
                                    <ArrowRight className="w-3.5 h-3.5 text-primary" />
                                    <span>Mover de Etapa</span>
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent className="w-52">
                                    {pipeline.stages.map((st) => (
                                      <DropdownMenuItem
                                        key={st.id}
                                        disabled={
                                          st.status_key === order.status ||
                                          st.name === order.status
                                        }
                                        onClick={() =>
                                          onUpdateOrderStatus(order.id, st.status_key || st.name)
                                        }
                                        className="text-xs flex items-center justify-between"
                                      >
                                        <span>{st.name}</span>
                                        {(st.status_key === order.status ||
                                          st.name === order.status) && (
                                          <Check className="w-3 h-3 text-emerald-600" />
                                        )}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>

                                {/* Arquivar */}
                                {onArchiveOrder && (
                                  <DropdownMenuItem
                                    onClick={() => onArchiveOrder(order)}
                                    className="text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                  >
                                    <Archive className="w-3.5 h-3.5" />
                                    <span>Arquivar Pedido</span>
                                  </DropdownMenuItem>
                                )}

                                {/* Copiar Rastreio se houver */}
                                {order.tracking_number && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      copyToClipboard(
                                        order.tracking_number!,
                                        "Código de rastreio"
                                      )
                                    }
                                    className="text-xs gap-1.5"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copiar Rastreio</span>
                                  </DropdownMenuItem>
                                )}

                                {/* Copiar Código Pix se houver */}
                                {order.pix_qr_code && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      copyToClipboard(
                                        order.pix_qr_code!,
                                        "Código Pix"
                                      )
                                    }
                                    className="text-xs gap-1.5"
                                  >
                                    <QrCode className="w-3.5 h-3.5" />
                                    <span>Copiar Código Pix</span>
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile View: Compact Expandable Cards (Screen width < 768px) */}
        <div className="flex md:hidden flex-1 min-h-0 flex-col overflow-y-auto space-y-2 pr-0.5">
          {paginatedOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground border rounded-lg bg-card">
              Nenhum pedido encontrado.
            </div>
          ) : (
            paginatedOrders.map((order) => {
              const isSelected = selectedIds.includes(order.id);
              const isExpanded = expandedMobileIds.includes(order.id);
              const isPaid =
                order.payment_status === "paid" ||
                ["pago", "recebido", "embalado", "enviado", "finalizado"].includes(
                  order.status
                );
              const hasLabel =
                order.has_shipping_file ||
                !!order.ml_label_url ||
                order.shipping_label_status === "ready";
              const stage =
                stageMap.get(order.status) || stageMap.get(order.status.toLowerCase());
              const formattedAmount = new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(order.total_amount || 0);

              return (
                <div
                  key={order.id}
                  className={cn(
                    "rounded-lg border bg-card p-3 space-y-2 shadow-2xs transition-colors",
                    isSelected && "border-primary bg-primary/5"
                  )}
                >
                  {/* Mobile Header: Checkbox + Number + Channel + Value */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelectRow(order.id)}
                      />
                      <span
                        className="font-bold text-sm tracking-tight text-foreground hover:text-primary cursor-pointer truncate"
                        onClick={() => onViewDetails(order)}
                      >
                        #{order.order_number}
                      </span>
                      {order.ml_order_id && (
                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                          ML
                        </span>
                      )}
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {order.channel_label || "OTHER"}
                      </Badge>
                    </div>

                    <div className="text-right shrink-0">
                      {order.is_marketplace ? (
                        <div className="flex flex-col items-end">
                          <div className="flex items-baseline gap-1">
                            <span className="text-[10px] text-muted-foreground">
                              {isPaid ? "Custo:" : "A Pagar:"}
                            </span>
                            <span className="text-sm font-bold text-foreground">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(order.supplier_cost || 0)}
                            </span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Venda:{" "}
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(order.sale_amount || order.total_amount || 0)}
                            {order.profit_amount > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                                (+
                                {new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(order.profit_amount)}
                                )
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-foreground">
                          {formattedAmount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Mobile Product Thumbnail + Name */}
                  <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded border border-border/40">
                    <div className="w-10 h-10 shrink-0 rounded bg-background border overflow-hidden flex items-center justify-center">
                      {order.main_product?.imageUrl ? (
                        <img
                          src={order.main_product.imageUrl}
                          alt={order.main_product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground line-clamp-1 leading-snug">
                        {order.main_product?.name || "Produto"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {order.total_items_count > 1
                          ? `${order.main_product?.quantity || 1} un. (+${order.total_items_count - 1} outros)`
                          : `${order.main_product?.quantity || 1} un.`}
                      </p>
                    </div>
                  </div>

                  {/* Mobile Status + Time in Stage */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] px-2 py-0.5 font-semibold",
                        stage?.color_class || "bg-slate-100 text-slate-800"
                      )}
                    >
                      {stage?.name || order.status}
                    </Badge>

                    {order.time_in_stage_display && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-muted-foreground/80" />
                        {order.time_in_stage_display}
                      </span>
                    )}
                  </div>

                  {/* Mobile Actions Toolbar */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-border/40">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onViewDetails(order)}
                        title="Ver detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      {isPaid ? (
                        <Badge className="h-7 px-2 text-[10px] bg-emerald-600 text-white font-medium">
                          Pago ✓
                        </Badge>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-medium bg-amber-500/10 text-amber-700"
                          onClick={() => onGeneratePix?.(order)}
                        >
                          <QrCode className="w-3 h-3 mr-1" />
                          Pix
                        </Button>
                      )}

                      {hasLabel ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-medium border-blue-200 text-blue-700"
                          onClick={() => onPrintLabel?.(order)}
                        >
                          <Printer className="w-3 h-3 mr-1" />
                          Imprimir
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-medium text-muted-foreground"
                          onClick={() =>
                            onGenerateLabel
                              ? onGenerateLabel(order)
                              : onViewDetails(order)
                          }
                        >
                          <FileText className="w-3 h-3 mr-1" />
                          Etiqueta
                        </Button>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-1.5 text-xs text-muted-foreground"
                      onClick={() => toggleMobileRow(order.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Expanded Operational Details on Mobile */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-dashed space-y-1 text-xs text-muted-foreground bg-muted/20 p-2 rounded">
                      <div className="flex justify-between">
                        <span>Rastreio:</span>
                        <span className="font-mono text-foreground font-medium">
                          {order.tracking_number || "Pendente"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Seller:</span>
                        <span className="text-foreground">{order.seller_name || "Lojafy"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cliente:</span>
                        <span className="text-foreground">{order.customer_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fornecedor:</span>
                        <span className="text-foreground">{order.supplier_name}</span>
                      </div>
                      {onArchiveOrder && (
                        <div className="pt-1.5 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[11px] text-muted-foreground hover:text-foreground gap-1 p-1"
                            onClick={() => onArchiveOrder(order)}
                          >
                            <Archive className="w-3 h-3" />
                            Arquivar pedido
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-2 px-3 rounded-lg border bg-card shrink-0 text-xs">
            <span className="text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                Anterior
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2.5"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}

        {/* Batch Archive Modal */}
        <BatchArchiveDialog
          orders={selectedOrdersList}
          isOpen={isBatchArchiveOpen}
          onClose={() => setIsBatchArchiveOpen(false)}
          onSuccess={() => {
            setIsBatchArchiveOpen(false);
            setSelectedIds([]);
            onRefreshOrders?.();
          }}
        />

        {/* Batch Move Stages Modal */}
        <Dialog open={isBatchMoveOpen} onOpenChange={setIsBatchMoveOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRight className="w-5 h-5 text-primary" />
                Mover Pedidos em Massa
              </DialogTitle>
              <DialogDescription>
                Selecione a nova etapa para onde os{" "}
                <strong className="text-foreground">
                  {selectedOrdersList.length} pedidos selecionados
                </strong>{" "}
                serão transferidos.
              </DialogDescription>
            </DialogHeader>

            <div className="py-3 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Etapa de Destino:
                </label>
                <Select
                  value={batchTargetStage}
                  onValueChange={setBatchTargetStage}
                >
                  <SelectTrigger className="w-full h-9 text-xs">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {pipeline.stages.map((st) => (
                      <SelectItem key={st.id} value={st.status_key || st.name}>
                        {st.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-lg bg-muted text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">Atenção:</p>
                <p>
                  Esta operação atualizará o estado operacional de todos os pedidos selecionados no banco de dados e no Kanban simultaneamente.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                disabled={isMovingBatch}
                onClick={() => setIsBatchMoveOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={isMovingBatch || !batchTargetStage}
                onClick={handleExecuteBatchMove}
                className="gap-1.5"
              >
                {isMovingBatch ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5" />
                )}
                {isMovingBatch ? "Movendo pedidos..." : "Confirmar Movimentação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};
