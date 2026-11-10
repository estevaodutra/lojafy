import React, { useState, useMemo } from "react";
import { OrderPipelineItem, OrderPipelineStage } from "@/types/orderPipeline";
import { useUserRole } from "@/hooks/useUserRole";
import { SUPPLIER_STATUSES } from "@/constants/orderStatus";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  Info,
  ArrowRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface OrderKanbanCardProps {
  order: OrderPipelineItem;
  activeStages?: OrderPipelineStage[];
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  onArchiveOrder?: (order: OrderPipelineItem) => void;
  onAdvanceStage?: (order: OrderPipelineItem, targetStatus: string) => Promise<void>;
  isDragging?: boolean;
}

export const OrderKanbanCard = React.memo<OrderKanbanCardProps>(({
  order,
  activeStages = [],
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
  onArchiveOrder,
  onAdvanceStage,
  isDragging = false,
}) => {
  const { isSuperAdmin, isSupplier } = useUserRole();
  const showAdminMetrics = isSuperAdmin();

  const [isAdvancing, setIsAdvancing] = useState(false);

  // Determinar a etapa atual do pedido na pipeline ativa
  const currentStageIndex = useMemo(() => {
    if (!activeStages || activeStages.length === 0) return -1;
    const orderStatus = (order.status || "").toLowerCase().trim();
    const ticketStatus = (order.active_ticket_status || "").toLowerCase().trim();

    const idx = activeStages.findIndex((stage) => {
      const sKey = (stage.status_key || "").toLowerCase().trim();
      const sName = stage.name.toLowerCase().trim();

      if (ticketStatus && (ticketStatus === sKey || ticketStatus === sName)) return true;
      if (orderStatus === sKey || orderStatus === sName) return true;

      if (orderStatus === "pendente" && (sKey === "pendente" || sName.includes("pagamento") || sName.includes("gerado") || sName.includes("novo"))) return true;
      if (orderStatus === "pago" && (sKey === "pago" || sName.includes("recebimento") || sName.includes("pago"))) return true;
      if (orderStatus === "recebido" && (sKey === "recebido" || sName.includes("recebido"))) return true;
      if (orderStatus === "embalado" && (sKey === "embalado" || sName.includes("embalado"))) return true;
      if (orderStatus === "enviado" && (sKey === "enviado" || sName.includes("enviado"))) return true;
      if (orderStatus === "finalizado" && (sKey === "finalizado" || sName.includes("finalizado") || sName.includes("entregue"))) return true;
      if (orderStatus === "cancelado" && (sKey === "cancelado" || sName.includes("cancelado"))) return true;
      if (orderStatus === "etiqueta_incorreta" && (sKey === "etiqueta_incorreta" || sName.includes("incorreta"))) return true;

      return false;
    });

    return idx >= 0 ? idx : 0;
  }, [activeStages, order.status, order.active_ticket_status]);

  // Etapas para frente (caminho para frente)
  const forwardStages = useMemo(() => {
    if (!activeStages || currentStageIndex < 0) return [];
    const rawForward = activeStages.slice(currentStageIndex + 1);

    if (isSupplier()) {
      const allowed = SUPPLIER_STATUSES as string[];
      return rawForward.filter((st) => {
        const key = (st.status_key || "").toLowerCase();
        const name = st.name.toLowerCase();
        return (
          allowed.includes(key) ||
          name.includes("recebido") ||
          name.includes("embalado") ||
          name.includes("enviado") ||
          name.includes("incorreta") ||
          name.includes("finalizado")
        );
      });
    }

    return rawForward;
  }, [activeStages, currentStageIndex, isSupplier]);

  const nextStage = forwardStages[0] || null;
  const canAdvanceStage = (isSuperAdmin() || isSupplier()) && !!nextStage && !!onAdvanceStage;

  const handleAdvanceTo = async (targetStatus: string) => {
    if (!onAdvanceStage || isAdvancing) return;
    try {
      setIsAdvancing(true);
      await onAdvanceStage(order, targetStatus);
      toast.success(`Pedido #${order.order_number} avançado para "${targetStatus}".`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao avançar etapa do pedido.");
    } finally {
      setIsAdvancing(false);
    }
  };

  const isPaid = order.payment_status === "paid" || ["pago", "recebido", "embalado", "enviado", "finalizado"].includes(order.status);
  const hasLabel = order.has_shipping_file || !!order.ml_label_url || order.shipping_label_status === "ready";

  const formatBRL = (val: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);

  const formatAmountOnly = (val: number) =>
    Math.abs(val || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatPercent = (val: number) =>
    `${(val || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  const formattedAmount = formatBRL(order.total_amount);

  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between rounded-lg border bg-card p-3.5 text-card-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/40",
        isDragging && "opacity-60 shadow-xl ring-2 ring-primary rotate-1 scale-105 z-50 cursor-grabbing",
        !isDragging && "cursor-grab active:cursor-grabbing"
      )}
    >
      <TooltipProvider delayDuration={200}>
        {/* Top Header: ID & Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Left: Internal order number & identifiers */}
          <div className="space-y-1 min-w-0">
            <div className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 flex-wrap">
              <span>#{order.order_number}</span>
              {order.ml_order_id && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                  ML: #{order.ml_order_id}
                </span>
              )}
            </div>

            {/* External Reference */}
            {order.external_reference && order.external_reference !== order.ml_order_id && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono truncate max-w-[170px] cursor-help">
                    <Link2 className="w-3 h-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{order.external_reference}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Referência externa: {order.external_reference}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Tracking Code */}
            {order.tracking_number && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-mono truncate max-w-[170px] cursor-help">
                    <Truck className="w-3 h-3 shrink-0 text-blue-500" />
                    <span className="truncate">{order.tracking_number}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Código de rastreio: {order.tracking_number}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Time in Stage indicator */}
            {order.time_in_stage_display && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium pt-0.5">
                <Clock className="w-2.5 h-2.5 text-muted-foreground/80" />
                <span>{order.time_in_stage_display}</span>
              </div>
            )}
          </div>

          {/* Right: Badges */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 font-semibold uppercase tracking-wider",
                  order.channel === "mercadolivre"
                    ? "bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800"
                    : order.channel === "shopee"
                    ? "bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {order.channel_label}
              </Badge>

              <Badge
                variant="secondary"
                className={cn(
                  "text-[10px] px-1.5 py-0 font-semibold tracking-wider",
                  order.origin_type === "AUTO"
                    ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                )}
              >
                {order.origin_type}
              </Badge>
            </div>

            {/* Optional Occurrence indicator if in occurrences or secondary pipeline */}
            {order.active_ticket_status && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0">
                Ocorrência: {order.active_ticket_status}
              </Badge>
            )}
          </div>
        </div>

        {/* Product Section */}
        <div className="flex items-center gap-2.5 my-2 p-2 rounded-md bg-muted/40 border border-border/50">
          <div className="relative w-12 h-12 shrink-0 rounded bg-background border overflow-hidden flex items-center justify-center">
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
            <p className="text-xs font-medium text-foreground line-clamp-2 leading-snug">
              {order.main_product?.name || "Produto"}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {order.total_items_count > 1 ? (
                <span>
                  {order.main_product?.quantity} un. • <strong className="text-foreground">+{order.total_items_count - 1} outros</strong> ({order.total_quantity_count} un. totais)
                </span>
              ) : (
                <span>{order.main_product?.quantity || 1} un.</span>
              )}
            </p>
          </div>
        </div>

        {/* Parties (Seller, Cliente, Fornecedor) */}
        <div className="grid grid-cols-1 gap-1 text-xs my-2 pt-1 border-t border-border/40">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Seller:</span>
            <span className="font-medium text-foreground truncate max-w-[180px] text-right" title={order.seller_name}>
              {order.seller_name}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Cliente:</span>
            <span className="font-medium text-foreground truncate max-w-[180px] text-right font-medium" title={order.customer_name}>
              {order.customer_name}
            </span>
          </div>

          {(order.customer_city || order.customer_state) && (
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Destino:</span>
              <span className="text-muted-foreground truncate max-w-[180px] text-right text-[10px]">
                {[order.customer_city, order.customer_state].filter(Boolean).join(" / ")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Fornecedor:</span>
            <span className="font-medium text-foreground truncate max-w-[180px] text-right" title={order.supplier_name}>
              {order.supplier_name}
            </span>
          </div>
        </div>

        {/* Informações Financeiras: Venda, Taxas, Custo, Lucro (Revendedor e Lojafy) */}
        {order.is_marketplace ? (
          <div className="pt-2 border-t border-border/50 my-1.5 space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1 text-xs">
              {/* Venda Revendedor */}
              <span className="text-muted-foreground">Venda</span>
              <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
              <span className="font-mono font-semibold text-foreground text-right tabular-nums">
                {formatAmountOnly(order.sale_amount)}
              </span>

              {/* Taxas Marketplace (Mercado Livre / Canal) com Tooltip Informativo */}
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <span>Taxas</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help inline-flex items-center">
                      <Info className="w-3 h-3 text-muted-foreground/70 hover:text-foreground transition-colors" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[240px] p-2.5 space-y-1.5 text-xs bg-popover text-popover-foreground shadow-md border">
                    <p className="font-semibold text-foreground text-[11px]">Composição das Taxas (Mercado Livre):</p>
                    {order.sale_amount < 79 ? (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Tarifa fixa unitária (&lt; R$ 79):</span>
                          <span className="font-mono text-rose-500 font-medium">R$ 6,00</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">
                            Comissão anúncio ({order.sale_amount > 0 ? (((order.marketplace_fee - 6) / order.sale_amount) * 100).toFixed(2) : "11,00"}%):
                          </span>
                          <span className="font-mono text-rose-500 font-medium">
                            {formatBRL(Math.max(0, order.marketplace_fee - 6))}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">
                          Comissão de categoria ({order.sale_amount > 0 ? ((order.marketplace_fee / order.sale_amount) * 100).toFixed(2) : "13,00"}%):
                        </span>
                        <span className="font-mono text-rose-500 font-medium">
                          {formatBRL(order.marketplace_fee)}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-border/60 pt-1 mt-1 flex justify-between font-semibold text-[11px]">
                      <span>Total retido pelo ML:</span>
                      <span className="font-mono text-rose-600 dark:text-rose-400">-{formatBRL(order.marketplace_fee)}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </span>
              <span className="font-mono text-rose-600 dark:text-rose-400 text-right text-[11px] font-medium">-R$</span>
              <span className="font-mono font-medium text-rose-600 dark:text-rose-400 text-right tabular-nums">
                {formatAmountOnly(order.marketplace_fee)}
              </span>

              {/* Custo Revendedor (preço da Lojafy) */}
              <span className="text-muted-foreground">Custo</span>
              <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
              <span className="font-mono font-semibold text-foreground text-right tabular-nums">
                {formatAmountOnly(order.seller_cost)}
              </span>

              {/* Lucro Líquido Revendedor com percentual */}
              <span className="font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <span>Lucro Líquido:</span>
                <span className="font-mono text-[11px] font-semibold">{formatPercent(order.seller_margin_pct)}</span>
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 text-right text-[11px] font-medium">R$</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right tabular-nums">
                {formatAmountOnly(order.seller_profit)}
              </span>
            </div>

            {/* Bloco Lojafy (Exclusivo para SuperAdmin) */}
            {showAdminMetrics && (
              <div className="pt-2 mt-2 border-t border-dashed border-border/70 bg-muted/20 -mx-3.5 px-3.5 py-1.5 rounded-b-none">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    Lojafy
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1 text-xs">
                  <span className="text-[11px] text-muted-foreground">Venda</span>
                  <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
                  <span className="font-mono font-medium text-foreground text-right tabular-nums text-[11px]">
                    {formatAmountOnly(order.lojafy_sale)}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <span>Taxas</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help inline-flex items-center">
                          <Info className="w-2.5 h-2.5 text-muted-foreground/70 hover:text-foreground transition-colors" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[240px] p-2.5 space-y-1.5 text-xs bg-popover text-popover-foreground shadow-md border">
                        <p className="font-semibold text-foreground text-[11px]">Composição das Taxas (Lojafy):</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Taxa de transação (4,50%):</span>
                            <span className="font-mono text-rose-500 font-medium">
                              {formatBRL(order.lojafy_sale * 0.045)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px]">
                            <span className="text-muted-foreground">Contingenciamento (1,00%):</span>
                            <span className="font-mono text-rose-500 font-medium">
                              {formatBRL((order.lojafy_sale - (order.lojafy_sale * 0.045)) * 0.01)}
                            </span>
                          </div>
                        </div>
                        <div className="border-t border-border/60 pt-1 mt-1 flex justify-between font-semibold text-[11px]">
                          <span>Total retido Lojafy:</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400">-{formatBRL(order.lojafy_fee)}</span>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-right text-[11px] font-medium">-R$</span>
                  <span className="font-mono font-medium text-rose-600 dark:text-rose-400 text-right tabular-nums text-[11px]">
                    {formatAmountOnly(order.lojafy_fee)}
                  </span>

                  <span className="text-[11px] text-muted-foreground">Custo</span>
                  <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
                  <span className="font-mono font-medium text-foreground text-right tabular-nums text-[11px]">
                    {formatAmountOnly(order.lojafy_cost)}
                  </span>

                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>Lucro Líquido:</span>
                    <span className="font-mono text-[10px] font-semibold">{formatPercent(order.lojafy_margin_pct)}</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-right text-[11px] font-medium">R$</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right tabular-nums text-[11px]">
                    {formatAmountOnly(order.lojafy_profit)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="pt-2 border-t border-border/50 my-1.5 space-y-1">
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1 text-xs">
              <span className="text-muted-foreground font-medium">Venda</span>
              <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
              <span className="font-mono font-bold text-foreground text-right tabular-nums text-sm">
                {formatAmountOnly(order.total_amount)}
              </span>

              {order.lojafy_fee > 0 && (
                <>
                  <span className="text-muted-foreground text-[11px]">Taxas</span>
                  <span className="font-mono text-rose-600 dark:text-rose-400 text-right text-[11px] font-medium">-R$</span>
                  <span className="font-mono font-medium text-rose-600 dark:text-rose-400 text-right tabular-nums text-[11px]">
                    {formatAmountOnly(order.lojafy_fee)}
                  </span>
                </>
              )}

              <span className="text-muted-foreground text-[11px]">Custo</span>
              <span className="font-mono text-muted-foreground text-right text-[11px]">R$</span>
              <span className="font-mono font-semibold text-foreground text-right tabular-nums text-[11px]">
                {formatAmountOnly(order.seller_cost)}
              </span>

              {showAdminMetrics && (
                <>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>Lucro Líquido:</span>
                    <span className="font-mono text-[10px] font-semibold">{formatPercent(order.lojafy_margin_pct)}</span>
                  </span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400 text-right text-[11px] font-medium">R$</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-right tabular-nums text-[11px]">
                    {formatAmountOnly(order.lojafy_profit)}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Indicador de Status do Pagamento */}
        <div className="pt-1 pb-0.5 flex items-center justify-between text-xs">
          {isPaid ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-600 dark:text-emerald-400">
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              Pago
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-amber-600 dark:text-amber-400">
              Pix pendente
            </span>
          )}
        </div>

        {/* Footer Actions: [ 👁 ] [ Gerar Pix / Pago ✓ ] [ Imprimir / Gerar etiqueta ] [ 📦 Arquivar ] */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-border/60 mt-1">
          {/* 1. Ver Detalhes */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 shrink-0 hover:bg-accent hover:text-accent-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(order);
                }}
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p className="text-xs">Ver detalhes do pedido</p>
            </TooltipContent>
          </Tooltip>

          {/* 1.5. Arquivar Pedido */}
          {onArchiveOrder && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-2 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchiveOrder(order);
                  }}
                >
                  <Archive className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Arquivar pedido</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* 2. Pix Action */}
          <div className="flex-1 min-w-0">
            {isPaid ? (
              <Badge
                variant="default"
                className="w-full h-8 justify-center bg-emerald-600 hover:bg-emerald-600 text-white font-medium text-xs shadow-none gap-1 pointer-events-none select-none"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Pago ✓</span>
              </Badge>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 px-2 text-xs font-medium gap-1 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 dark:text-amber-400 border border-amber-500/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onGeneratePix?.(order);
                }}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span className="truncate">Gerar Pix</span>
              </Button>
            )}
          </div>

          {/* 3. Etiqueta Action */}
          <div className="flex-1 min-w-0">
            {hasLabel ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 px-2 text-xs font-medium gap-1 border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                onClick={(e) => {
                  e.stopPropagation();
                  onPrintLabel?.(order);
                }}
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="truncate">Imprimir</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-8 px-2 text-xs font-medium gap-1 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onGenerateLabel ? onGenerateLabel(order) : onViewDetails(order);
                }}
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="truncate">Etiqueta</span>
              </Button>
            )}
          </div>
        </div>

        {/* 4. Linha de Avançar Etapa (Super Admin e Fornecedor) */}
        {canAdvanceStage && nextStage && (
          <div className="pt-2 border-t border-border/50 flex items-stretch gap-1 mt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800 gap-1.5 justify-center transition-colors shadow-2xs"
              onClick={(e) => {
                e.stopPropagation();
                handleAdvanceTo(nextStage.name);
              }}
              disabled={isAdvancing}
              title={`Avançar para "${nextStage.name}"`}
            >
              {isAdvancing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5] shrink-0 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="truncate">Avançar para {nextStage.name}</span>
            </Button>

            {forwardStages.length > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 shrink-0 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50 border-emerald-300 dark:border-emerald-800 shadow-2xs"
                    disabled={isAdvancing}
                    title="Escolher para qual etapa avançar"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 bg-popover shadow-xl border">
                  <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Avançar para etapa:
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {forwardStages.map((stage, idx) => (
                    <DropdownMenuItem
                      key={stage.id || stage.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAdvanceTo(stage.name);
                      }}
                      className="text-xs cursor-pointer flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            idx === 0 ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-muted-foreground/40"
                          )}
                        />
                        <span className={cn("truncate", idx === 0 ? "font-semibold text-foreground" : "text-foreground/80")}>
                          {stage.name}
                        </span>
                      </div>
                      {idx === 0 && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 bg-emerald-50 text-emerald-700 border-emerald-300 shrink-0 font-medium">
                          Próxima
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </TooltipProvider>
    </div>
  );
});

OrderKanbanCard.displayName = "OrderKanbanCard";
