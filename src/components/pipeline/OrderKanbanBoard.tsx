import React, { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { OrderPipeline, OrderPipelineItem } from "@/types/orderPipeline";
import { OrderKanbanColumn } from "./OrderKanbanColumn";
import { OrderKanbanCard } from "./OrderKanbanCard";
import { STATUS_TRANSITIONS, SUPPLIER_STATUSES, OrderStatus } from "@/constants/orderStatus";
import { useUserRole } from "@/hooks/useUserRole";
import { useOrderPreferences } from "@/hooks/useOrderPreferences";
import { ReturnCodeModal } from "./ReturnCodeModal";
import {
  isOccurrenceStageAllowedForReseller,
  isEntregaHojeStage,
  notifySupplierOfDeliveryToday,
} from "@/services/orderOccurrenceDeliveryService";
import { toast } from "sonner";

interface OrderKanbanBoardProps {
  pipeline: OrderPipeline;
  orders: OrderPipelineItem[];
  onUpdateOrderStatus: (
    orderId: string,
    newStatus: string,
    metadata?: { returnCode?: string | null }
  ) => Promise<void>;
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

  // Controle do modal de código de devolução / recebimento ao mover para Entrega Hoje
  const [pendingDeliveryTodayOrder, setPendingDeliveryTodayOrder] = useState<OrderPipelineItem | null>(null);
  const [pendingTargetStatus, setPendingTargetStatus] = useState<string>("Entrega Hoje");

  // Sensores rápidos e sem conflitos com cliques internos
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    })
  );

  const activeStages = useMemo(() => {
    return (pipeline.stages || []).filter((s) => s.is_active);
  }, [pipeline.stages]);

  // Detecção de colisão dedicada para colunas: identifica a coluna alvo imediatamente ao passar o mouse por cima
  const kanbanCollisionDetection: CollisionDetection = useCallback((args) => {
    // 1. Ponteiro dentro do droppable da coluna
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    // 2. Interseção de retângulo do card com as colunas
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }

    // 3. Fallback
    return closestCenter(args);
  }, []);

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
          // 1. Casamento direto
          if (ticketStatus === sKey || ticketStatus === sName || orderStatus === sKey || orderStatus === sName) return true;

          // 2. Etapa 1: Nova Ocorrência
          if (
            (sKey === "nova_ocorrencia" || sKey === "aberto" || sName.includes("nova") || sName.includes("abert")) &&
            (orderStatus.includes("devolucao") || orderStatus.includes("cancelamento") || !!order.has_solicitation || !!order.solicitation_type)
          ) {
            return true;
          }

          // 3. Etapa 2: Produto Enviado
          if (
            (sKey === "produto_enviado" || sName.includes("enviado")) &&
            (orderStatus === "enviado" || orderStatus === "produto_enviado" || orderStatus === "devolucao_andamento")
          ) {
            return true;
          }

          // 4. Etapa 3: Entrega Hoje
          if (isEntregaHojeStage(sKey) || isEntregaHojeStage(sName)) {
            if (orderStatus === "entrega_hoje" || orderStatus === "entrega hoje") return true;
          }

          // 5. Etapa 4: Produto Recebido
          if (
            (sKey === "produto_recebido" || sName.includes("recebido")) &&
            (orderStatus === "recebido" || orderStatus === "devolucao_recebida")
          ) {
            return true;
          }

          // 6. Etapa 5: Em Análise
          if (
            (sKey === "em_analise" || sName.includes("analise") || sName.includes("análise")) &&
            (orderStatus === "em_analise" || orderStatus === "devolucao_analise")
          ) {
            return true;
          }

          // 7. Etapa 6: Aprovado Troca/Devolução
          if (
            (sKey === "aprovado_troca_devolucao" || sName.includes("aprovado")) &&
            (orderStatus === "devolucao_aprovada" || orderStatus.includes("aprovad"))
          ) {
            return true;
          }

          // 8. Etapa 7: Resolvido
          if (
            (sKey === "resolvido" || sName.includes("resolv")) &&
            (ticketStatus === "resolvido" || orderStatus === "resolvido" || orderStatus === "reembolsado")
          ) {
            return true;
          }

          // 9. Etapa 8: Cancelado
          if (
            (sKey === "cancelado" || sName.includes("cancel")) &&
            orderStatus === "cancelado"
          ) {
            return true;
          }

          return false;
        }

        // Casamento direto por chave ou nome exato
        if (orderStatus === sKey || orderStatus === sName) return true;

        // Casamentos padrão
        if (
          (orderStatus === "pendente" || orderStatus === "novo pedido" || orderStatus.includes("pagamento") || orderStatus.includes("gerado")) &&
          (sKey === "pendente" || sName.includes("pagamento") || sName.includes("gerado") || sKey === "pago" || sName === "pedido pago")
        ) {
          return true;
        }

        if (
          (orderStatus === "pago" || orderStatus.includes("pedido pago") || orderStatus.includes("recebimento da expedição")) &&
          (sKey === "pago" || sName.includes("pago") || sName.includes("recebimento"))
        ) {
          return true;
        }

        if (
          (orderStatus === "ag_liberacao_etiqueta" || orderStatus.includes("libera")) &&
          (sKey === "ag_liberacao_etiqueta" || sName.includes("libera"))
        ) {
          return true;
        }

        if (
          (orderStatus === "recebido" || orderStatus.includes("pedido recebido")) &&
          (sKey === "recebido" || sName.includes("recebido"))
        ) {
          return true;
        }

        if (
          (orderStatus === "embalado" || orderStatus.includes("embalado")) &&
          (sKey === "embalado" || sName.includes("embalado"))
        ) {
          return true;
        }

        if (
          (orderStatus === "enviado" || orderStatus.includes("enviado")) &&
          (sKey === "enviado" || sName.includes("enviado"))
        ) {
          return true;
        }

        if (
          (orderStatus === "finalizado" || orderStatus.includes("finalizado")) &&
          (sKey === "finalizado" || sName.includes("finalizado"))
        ) {
          return true;
        }

        if (
          (orderStatus === "cancelado" || orderStatus.includes("cancelado")) &&
          (sKey === "cancelado" || sName.includes("cancelado"))
        ) {
          return true;
        }

        if (
          (orderStatus === "etiqueta_incorreta" || orderStatus.includes("incorreta")) &&
          (sKey === "etiqueta_incorreta" || sName.includes("incorreta"))
        ) {
          return true;
        }

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

    // Validação por perfil:
    // Na pipeline principal, apenas Super Admin e Fornecedor podem movimentar cards livremente por arrasto.
    // Na pipeline de ocorrências, o Revendedor pode movimentar apenas entre as 3 primeiras etapas (Nova Ocorrência, Produto Enviado, Entrega Hoje).
    if (role === "reseller") {
      if (pipeline.key !== "occurrences") {
        toast.error("Revendedores não podem alterar o status operacional diretamente por arrasto.");
        return;
      }

      const isTargetAllowed = isOccurrenceStageAllowedForReseller(targetStage, activeStages);
      if (!isTargetAllowed) {
        toast.error("Revendedores só podem movimentar pedidos entre Nova Ocorrência, Produto Enviado e Entrega Hoje.");
        return;
      }
    }

    // Se estiver movendo para 'Entrega Hoje', abre a janelinha para informar o código de devolução/recebimento
    if (isEntregaHojeStage(newStatus)) {
      setPendingDeliveryTodayOrder(draggedOrder);
      setPendingTargetStatus(newStatus);
      return;
    }

    await executeStatusUpdate(draggedOrder, newStatus);
  };

  const executeStatusUpdate = async (
    targetOrder: OrderPipelineItem,
    targetStatus: string,
    returnCode?: string | null
  ) => {
    try {
      await onUpdateOrderStatus(targetOrder.id, targetStatus, { returnCode });

      // Se for Entrega Hoje, disparar a notificação para o fornecedor
      if (isEntregaHojeStage(targetStatus)) {
        await notifySupplierOfDeliveryToday(targetOrder, returnCode);
      }

      toast.success(`Pedido #${targetOrder.order_number} movido para "${targetStatus}".`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar status do pedido.");
    }
  };

  const handleAdvanceStage = useCallback(
    async (order: OrderPipelineItem, targetStatus: string) => {
      // Se for para Entrega Hoje, interceptar e abrir o modal de código de recebimento
      if (isEntregaHojeStage(targetStatus)) {
        setPendingDeliveryTodayOrder(order);
        setPendingTargetStatus(targetStatus);
        return;
      }
      await executeStatusUpdate(order, targetStatus);
    },
    [onUpdateOrderStatus]
  );

  const isResellerDropDisabled = useCallback(
    (stage: OrderPipelineStage) => {
      if (role !== "reseller") return false;
      if (pipeline.key !== "occurrences") return true;
      return !isOccurrenceStageAllowedForReseller(stage, activeStages);
    },
    [role, pipeline.key, activeStages]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={kanbanCollisionDetection}
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
                activeStages={activeStages}
                onViewDetails={onViewDetails}
                onGeneratePix={onGeneratePix}
                onPrintLabel={onPrintLabel}
                onGenerateLabel={onGenerateLabel}
                onArchiveOrder={onArchiveOrder}
                onAdvanceStage={handleAdvanceStage}
                isDropDisabled={isResellerDropDisabled(stage)}
              />
            );
          })}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeOrder ? (
          <div className="w-[300px] sm:w-[320px] pointer-events-none opacity-90 shadow-2xl rotate-1 scale-[1.02]">
            <OrderKanbanCard
              order={activeOrder}
              activeStages={activeStages}
              onViewDetails={() => {}}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* Modal de Código de Devolução / Recebimento ao Mover para Entrega Hoje */}
      <ReturnCodeModal
        open={!!pendingDeliveryTodayOrder}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeliveryTodayOrder(null);
          }
        }}
        order={pendingDeliveryTodayOrder}
        targetStageName={pendingTargetStatus}
        onConfirm={async (returnCode) => {
          if (!pendingDeliveryTodayOrder) return;
          await executeStatusUpdate(
            pendingDeliveryTodayOrder,
            pendingTargetStatus,
            returnCode
          );
          setPendingDeliveryTodayOrder(null);
        }}
      />
    </DndContext>
  );
};
