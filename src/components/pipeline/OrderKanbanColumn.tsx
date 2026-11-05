import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OrderPipelineStage, OrderPipelineItem } from "@/types/orderPipeline";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface OrderKanbanColumnProps {
  stage: OrderPipelineStage;
  orders: OrderPipelineItem[];
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  onArchiveOrder?: (order: OrderPipelineItem) => void;
  isDropDisabled?: boolean;
}

const SortableOrderCard: React.FC<{
  order: OrderPipelineItem;
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  onArchiveOrder?: (order: OrderPipelineItem) => void;
}> = ({ order, onViewDetails, onGeneratePix, onPrintLabel, onGenerateLabel, onArchiveOrder }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: order.id,
    data: { order },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OrderKanbanCard
        order={order}
        onViewDetails={onViewDetails}
        onGeneratePix={onGeneratePix}
        onPrintLabel={onPrintLabel}
        onGenerateLabel={onGenerateLabel}
        onArchiveOrder={onArchiveOrder}
        isDragging={isDragging}
      />
    </div>
  );
};

export const OrderKanbanColumn: React.FC<OrderKanbanColumnProps> = ({
  stage,
  orders,
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
  onArchiveOrder,
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
        "flex flex-col h-full min-h-0 w-[300px] sm:w-[320px] shrink-0 rounded-xl border bg-muted/20 p-2 transition-colors duration-200 select-none shadow-2xs",
        isOver && "border-primary/80 bg-primary/5 ring-2 ring-primary/20",
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

      {/* Cards Scroll Area (Independent Vertical Scroll per Column) */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pr-0 pb-2 space-y-2 scrollbar-none">
        <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          {orders.map((order) => (
            <SortableOrderCard
              key={order.id}
              order={order}
              onViewDetails={onViewDetails}
              onGeneratePix={onGeneratePix}
              onPrintLabel={onPrintLabel}
              onGenerateLabel={onGenerateLabel}
              onArchiveOrder={onArchiveOrder}
            />
          ))}
        </SortableContext>

        {orders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 rounded-lg border border-dashed border-border/60 p-3 text-center">
            <p className="text-[11px] text-muted-foreground">Nenhum pedido nesta etapa</p>
          </div>
        )}
      </div>
    </div>
  );
};
