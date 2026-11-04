import React from "react";
import { OrderPipelineItem } from "@/types/orderPipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Eye, Link2, Truck, Check, QrCode, Printer, FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderKanbanCardProps {
  order: OrderPipelineItem;
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  isDragging?: boolean;
}

export const OrderKanbanCard: React.FC<OrderKanbanCardProps> = ({
  order,
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
  isDragging = false,
}) => {
  const isPaid = order.payment_status === "paid" || ["pago", "recebido", "embalado", "enviado", "finalizado"].includes(order.status);
  const hasLabel = order.has_shipping_file || !!order.ml_label_url || order.shipping_label_status === "ready";

  const formattedAmount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(order.total_amount);

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
            <div className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
              <span>#{order.order_number}</span>
            </div>

            {/* External Reference */}
            {order.external_reference && (
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
            <span className="font-medium text-foreground truncate max-w-[180px] text-right" title={order.customer_name}>
              {order.customer_name}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Fornecedor:</span>
            <span className="font-medium text-foreground truncate max-w-[180px] text-right" title={order.supplier_name}>
              {order.supplier_name}
            </span>
          </div>
        </div>

        {/* Valor Final em destaque */}
        <div className="flex items-baseline justify-between pt-1 border-t border-border/40 my-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">Total</span>
          <span className="text-sm font-bold text-foreground tracking-tight">
            {formattedAmount}
          </span>
        </div>

        {/* Footer Actions: [ 👁 ] [ Gerar Pix / Pago ✓ ] [ Imprimir / Gerar etiqueta ] */}
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
      </TooltipProvider>
    </div>
  );
};
