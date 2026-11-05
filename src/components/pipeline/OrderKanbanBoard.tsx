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
import { useOrderPreferences } from "@/hooks/useOrderPreferences";
import { toast } from "sonner";

interface OrderKanbanBoardProps {
  pipeline: OrderPipeline;
  orders: OrderPipelineItem[];
  onUpdateOrderStatus: (orderId: string, newStatus: string) => Promise<void>;
  onViewDetails: (order: OrderPipelineItem) => void;
  onGeneratePix?: (order: OrderPipelineItem) => void;
  onPrintLabel?: (order: OrderPipelineItem) => void;
  onGenerateLabel?: (order: OrderPipelineItem) => void;
  onArchiveOrder?: (order: OrderPipelineItem) => void;
}

export const OrderKanbanBoard: React.FC<OrderKanbanBoardProps> = ({
  pipeline,
  orders,
  onUpdateOrderStatus,
  onViewDetails,
  onGeneratePix,
  onPrintLabel,
  onGenerateLabel,
  onArchiveOrder,
}) => {
  const { role, isSuperAdmin, isSupplier } = useUserRole();
  const { sortOrders } = useOrderPreferences();
  const [activeOrder, setActiveOrder] = useState<OrderPipelineItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeStages = (pipeline.stages || []).filter((s) => s.is_active);

  // Map orders by stage: o status do pedido é o nome da etapa
  const ordersByStage = React.useMemo(() => {
    const map = new Map<string, OrderPipelineItem[]>();
    activeStages.forEach((stage) => {
      map.set(stage.status_key || stage.name, []);
    });

    orders.forEach((order) => {
      const orderStatus = (order.status || "").toLowerCase().trim();
      const ticketStatus = (order.active_ticket_status || "").toLowerCase().trim();

      // Encontrar a etapa correspondente
      const matchedStage = activeStages.find((stage) => {
        const sKey = (stage.status_key || "").toLowerCase().trim();
        const sName = stage.name.toLowerCase().trim();

        if (pipeline.key === "occurrences") {
          return ticketStatus === sKey || ticketStatus === sName || orderStatus === sKey || orderStatus === sName;
        }

        // Casamento direto por chave ou nome exato
        if (orderStatus === sKey || orderStatus === sName) return true;

        // Casamentos padrão
        if (orderStatus === "pendente" && (sKey === "pendente" || sName.includes("pagamento") || sName.includes("gerado"))) return true;
        if (orderStatus === "pago" && (sKey === "pago" || sName.includes("recebimento") || sName.includes("pago"))) return true;
        if (orderStatus === "recebido" && (sKey === "recebido" || sName.includes("recebido"))) return true;
        if (orderStatus === "embalado" && (sKey === "embalado" || sName.includes("embalado"))) return true;
        if (orderStatus === "enviado" && (sKey === "enviado" || sName.includes("enviado"))) return true;
        if (orderStatus === "finalizado" && (sKey === "finalizado" || sName.includes("finalizado"))) return true;
        if (orderStatus === "cancelado" && (sKey === "cancelado" || sName.includes("cancelado"))) return true;
        if (orderStatus === "etiqueta_incorreta" && (sKey === "etiqueta_incorreta" || sName.includes("incorreta"))) return true;

        return false;
      });

      if (matchedStage) {
        const key = matchedStage.status_key || matchedStage.name;
        if (map.has(key)) {
          map.get(key)!.push(order);
        }
      } else if (activeStages.length > 0) {
        const firstKey = activeStages[0].status_key || activeStages[0].name;
        if (map.has(firstKey)) {
          map.get(firstKey)!.push(order);
        }
      }
    });

    // Apply sorting per column: default oldest first (ORDER BY created_at ASC, id ASC)
    map.forEach((items, key) => {
      map.set(key, sortOrders(items));
    });

    return map;
  }, [activeStages, orders, pipeline.key, sortOrders]);

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

    // Encontrar etapa alvo
    let targetStage = activeStages.find(
      (s) => s.status_key === over.id || s.name === over.id || s.id === over.id
    );

    if (!targetStage) {
      const targetOrder = orders.find((o) => o.id === over.id);
      if (targetOrder) {
        targetStage = activeStages.find(
          (s) => s.status_key === targetOrder.status || s.name === targetOrder.status
        );
      }
    }

    if (!targetStage) return;

    // O novo status do pedido é o nome da etapa
    const newStatus = targetStage.name;
    const currentStatus = draggedOrder.status;

    if (currentStatus === newStatus || currentStatus === targetStage.status_key) {
      return;
    }

    // Validação por perfil
    if (role === "reseller") {
      toast.error("Revendedores não podem alterar o status operacional diretamente por arrasto.");
      return;
    }

    if (isSupplier()) {
      const allowed = SUPPLIER_STATUSES as string[];
      const isAllowed =
        allowed.includes(targetStage.status_key) ||
        targetStage.name.toLowerCase().includes("recebido") ||
        targetStage.name.toLowerCase().includes("enviado") ||
        targetStage.name.toLowerCase().includes("incorreta");

      if (!isAllowed) {
        toast.error(`Fornecedores não têm permissão para mover pedidos para esta etapa.`);
        return;
      }
    }

    try {
      await onUpdateOrderStatus(orderId, newStatus);
      toast.success(`Pedido #${draggedOrder.order_number} movido para "${newStatus}".`);
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
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden pb-1 scrollbar-subtle">
        <div className="flex items-stretch h-full gap-3 min-w-max px-0.5">
          {activeStages.map((stage) => {
            const stageOrders = ordersByStage.get(stage.status_key || stage.name) || [];
            return (
              <OrderKanbanColumn
                key={stage.id}
                stage={stage}
                orders={stageOrders}
                onViewDetails={onViewDetails}
                onGeneratePix={onGeneratePix}
                onPrintLabel={onPrintLabel}
                onGenerateLabel={onGenerateLabel}
                onArchiveOrder={onArchiveOrder}
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
