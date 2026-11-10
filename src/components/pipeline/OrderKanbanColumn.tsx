import React from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { OrderPipelineStage, OrderPipelineItem } from "@/types/orderPipeline";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface OrderKanbanColumnProps {
  stage: OrderPipelineStage;
  orders: OrderPipelineItem[];
  activeStages: OrderPipelineStage[];
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  onArchiveOrder?: (order: OrderPipelineItem) => void;
  onAdvanceStage?: (order: OrderPipelineItem, targetStatus: string) => Promise<void>;
  isDropDisabled?: boolean;
}

const DraggableOrderCard = React.memo<{
  order: OrderPipelineItem;
  activeStages: OrderPipelineStage[];
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  onArchiveOrder?: (order: OrderPipelineItem) => void;
  onAdvanceStage?: (order: OrderPipelineItem, targetStatus: string) => Promise<void>;
}>(({
  order,
  activeStages,
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
  onArchiveOrder,
  onAdvanceStage,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: order.id,
    data: { order },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "touch-none transition-opacity",
        isDragging && "opacity-30 pointer-events-none"
      )}
    >
      <OrderKanbanCard
        order={order}
        activeStages={activeStages}
        onViewDetails={onViewDetails}
        onGeneratePix={onGeneratePix}
        onPrintLabel={onPrintLabel}
        onGenerateLabel={onGenerateLabel}
        onArchiveOrder={onArchiveOrder}
        onAdvanceStage={onAdvanceStage}
        isDragging={isDragging}
      />
    </div>
  );
});

DraggableOrderCard.displayName = "DraggableOrderCard";

export const OrderKanbanColumn = React.memo<OrderKanbanColumnProps>(({
  stage,
  orders,
  activeStages,
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
  onArchiveOrder,
  onAdvanceStage,
  isDropDisabled = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.status_key || stage.name,
    disabled: isDropDisabled,
    data: { stage },
  });

  const IconComponent = (Icons as any)[stage.icon_name || ""] || Icons.Circle;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-h-0 w-[300px] sm:w-[320px] shrink-0 rounded-xl border bg-muted/20 p-2 transition-all duration-150 select-none shadow-2xs",
        isOver && "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-md",
        !stage.is_active && "opacity-50"
      )}
    >
      {/* Column Header (Fixed within Column) */}
      <div className="flex items-center justify-between gap-1.5 px-2 py-1.5 mb-2 rounded-lg bg-background/90 border border-border/50 shadow-2xs shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div
            className={cn(
              "w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-xs font-semibold border",
              stage.color_class || "bg-secondary text-secondary-foreground"
            )}
          >
            <IconComponent className="w-3 h-3" />
          </div>

          <h3
            className="text-xs font-semibold text-foreground truncate leading-snug"
            title={stage.name}
          >
            {stage.name}
          </h3>
        </div>

        <Badge
          variant="secondary"
          className="shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
        >
          {orders.length}
        </Badge>
      </div>

      {/* Drop Zone Feedback Banner */}
      {isOver && (
        <div className="flex items-center justify-center gap-1.5 py-2 px-3 mb-2 rounded-lg border-2 border-dashed border-primary bg-primary/20 text-primary text-xs font-semibold animate-pulse shrink-0 shadow-xs">
          <Icons.ArrowDown className="w-4 h-4 animate-bounce" />
          <span>Solte para mover para {stage.name}</span>
        </div>
      )}

      {/* Cards Scroll Area (Independent Vertical Scroll per Column) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0 pb-2 space-y-2 scrollbar-none">
        {orders.map((order) => (
          <DraggableOrderCard
            key={order.id}
            order={order}
            activeStages={activeStages}
            onViewDetails={onViewDetails}
            onGeneratePix={onGeneratePix}
            onPrintLabel={onPrintLabel}
            onGenerateLabel={onGenerateLabel}
            onArchiveOrder={onArchiveOrder}
            onAdvanceStage={onAdvanceStage}
          />
        ))}

        {orders.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center h-28 rounded-lg border border-dashed border-border/60 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Nenhum pedido nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
});

OrderKanbanColumn.displayName = "OrderKanbanColumn";
