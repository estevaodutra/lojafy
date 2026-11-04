import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OrderPipelineStage, OrderPipelineItem } from "@/types/orderPipeline";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface OrderKanbanColumnProps {
  stage: OrderPipelineStage;
  orders: OrderPipelineItem[];
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  isDropDisabled?: boolean;
}

const SortableOrderCard: React.FC<{
  order: OrderPipelineItem;
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
}> = ({ order, onViewDetails, onGeneratePix, onPrintLabel, onGenerateLabel }) => {
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
  isDropDisabled = false,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.status_key,
    disabled: isDropDisabled,
    data: { stage },
  });

  // Dynamic Icon
  const IconComponent = (Icons as any)[stage.icon_name || ""] || Icons.Circle;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col w-[320px] md:w-[340px] shrink-0 rounded-xl border bg-muted/30 p-2.5 transition-colors duration-200 select-none",
        isOver && "border-primary/80 bg-primary/5 ring-2 ring-primary/20",
        !stage.is_active && "opacity-50"
      )}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 px-2 py-2 mb-2 rounded-lg bg-background/80 border border-border/40 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-xs font-semibold border",
              stage.color_class || "bg-secondary text-secondary-foreground"
            )}
          >
            <IconComponent className="w-3.5 h-3.5" />
          </div>

          <h3
            className="text-xs font-semibold text-foreground truncate leading-tight"
            title={stage.name}
          >
            {stage.name}
          </h3>
        </div>

        <Badge
          variant="secondary"
          className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
        >
          {orders.length}
        </Badge>
      </div>

      {/* Cards Scroll Area */}
      <ScrollArea className="flex-1 max-h-[calc(100vh-280px)] pr-1">
        <div className="flex flex-col gap-2.5 p-1 pb-4 min-h-[150px]">
          <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
            {orders.map((order) => (
              <SortableOrderCard
                key={order.id}
                order={order}
                onViewDetails={onViewDetails}
                onGeneratePix={onGeneratePix}
                onPrintLabel={onPrintLabel}
                onGenerateLabel={onGenerateLabel}
              />
            ))}
          </SortableContext>

          {orders.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 rounded-lg border border-dashed border-border/60 p-4 text-center">
              <p className="text-xs text-muted-foreground">Nenhum pedido nesta etapa</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
