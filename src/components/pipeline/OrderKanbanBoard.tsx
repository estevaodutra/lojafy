import React, { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { OrderPipeline, OrderPipelineItem } from "@/types/orderPipeline";
import { OrderKanbanColumn } from "./OrderKanbanColumn";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { STATUS_TRANSITIONS, SUPPLIER_STATUSES, OrderStatus } from "@/constants/orderStatus";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

interface OrderKanbanBoardProps {
  pipeline: OrderPipeline;
  orders: OrderPipelineItem[];
  onUpdateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
}

export const OrderKanbanBoard: React.FC<OrderKanbanBoardProps> = ({
  pipeline,
  orders,
  onUpdateOrderStatus,
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
}) => {
  const { role, isSuperAdmin, isSupplier } = useUserRole();
  const [activeOrder, setActiveOrder] = useState<OrderPipelineItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requires 8px drag before activating to preserve normal clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group active stages
  const activeStages = (pipeline.stages || []).filter((s) => s.is_active);

  // Map orders by stage status_key
  const ordersByStage = React.useMemo(() => {
    const map = new Map<string, OrderPipelineItem[]>();
    activeStages.forEach((stage) => {
      map.set(stage.status_key, []);
    });

    orders.forEach((order) => {
      // In primary pipeline, match by order.status
      // In occurrences pipeline, match by active_ticket_status or order.status
      const targetKey =
        pipeline.key === "occurrences"
          ? order.active_ticket_status || "aberto"
          : order.status;

      if (map.has(targetKey)) {
        map.get(targetKey)!.push(order);
      } else {
        // Fallback: if status not matched to an active stage, put in first stage or match loosely
        const firstStage = activeStages[0]?.status_key;
        if (firstStage && map.has(firstStage)) {
          // Keep in first column if applicable
        }
      }
    });

    return map;
  }, [activeStages, orders, pipeline.key]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const order = orders.find((o) => o.id === active.id);
    if (order) {
      setActiveOrder(order);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveOrder(null);

    if (!over) return;

    const orderId = String(active.id);
    const draggedOrder = orders.find((o) => o.id === orderId);
    if (!draggedOrder) return;

    // Determine target status
    let targetStatusKey: string | null = null;

    // If dropped directly onto a column container
    if (activeStages.some((s) => s.status_key === over.id)) {
      targetStatusKey = String(over.id);
    } else {
      // If dropped onto another card in a column
      const targetOrder = orders.find((o) => o.id === over.id);
      if (targetOrder) {
        targetStatusKey =
          pipeline.key === "occurrences"
            ? targetOrder.active_ticket_status || "aberto"
            : targetOrder.status;
      }
    }

    if (!targetStatusKey) return;

    const currentStatus =
      pipeline.key === "occurrences"
        ? draggedOrder.active_ticket_status || "aberto"
        : draggedOrder.status;

    if (currentStatus === targetStatusKey) {
      return; // Same stage, no transition
    }

    // Role-based validation
    if (role === "reseller") {
      toast.error("Revendedores não podem alterar o status operacional diretamente por arrasto.");
      return;
    }

    if (isSupplier()) {
      if (!SUPPLIER_STATUSES.includes(targetStatusKey as OrderStatus)) {
        toast.error(`Fornecedores não têm permissão para mover pedidos para esta etapa.`);
        return;
      }
    }

    // Pipeline transition validation for primary pipeline
    if (pipeline.key === "primary") {
      const allowedTransitions = STATUS_TRANSITIONS[currentStatus as OrderStatus] || [];
      // Super admin can override if needed, but warning displayed
      if (!allowedTransitions.includes(targetStatusKey as OrderStatus) && !isSuperAdmin()) {
        toast.error(
          `Transição inválida: Não é permitido mover de "${currentStatus}" diretamente para "${targetStatusKey}".`
        );
        return;
      }
    }

    try {
      await onUpdateOrderStatus(orderId, targetStatusKey);
      toast.success(`Pedido #${draggedOrder.order_number} movido para "${targetStatusKey}".`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status do pedido.");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-muted-foreground/20">
        <div className="flex items-start gap-4 min-w-max px-1">
          {activeStages.map((stage) => {
            const stageOrders = ordersByStage.get(stage.status_key) || [];
            return (
              <OrderKanbanColumn
                key={stage.id}
                stage={stage}
                orders={stageOrders}
                onViewDetails={onViewDetails}
                onGeneratePix={onGeneratePix}
                onPrintLabel={onPrintLabel}
                onGenerateLabel={onGenerateLabel}
                isDropDisabled={role === "reseller"}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOrder ? (
          <div className="w-[320px] md:w-[340px] pointer-events-none">
            <OrderKanbanCard
              order={activeOrder}
              onViewDetails={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
