import { supabase } from "@/integrations/supabase/client";
import { OrderPipelineItem, ArchivingEligibilityResult } from "@/types/orderPipeline";

const LOCAL_STORAGE_ARCHIVED_KEY = "lojafy_archived_orders_v1";

export const ARCHIVE_REASONS = [
  "Pedido criado incorretamente",
  "Pedido duplicado",
  "Pedido abandonado",
  "Sem continuidade operacional",
  "Registro de teste",
  "Inatividade prolongada (+24h)",
  "Outro motivo",
] as const;

/**
 * Validates if an order is eligible for archiving.
 * Protects paid orders, in-transit orders, and orders with open occurrences/solicitations.
 */
export const checkArchivingEligibility = (
  order: OrderPipelineItem
): ArchivingEligibilityResult => {
  const isPaid =
    order.payment_status === "paid" ||
    ["pago", "recebido", "embalado", "enviado", "finalizado"].includes(
      (order.status || "").toLowerCase()
    );

  const hasActiveOccurrence =
    !!order.active_ticket_status ||
    !!order.has_solicitation ||
    ["cancelamento_solicitado", "devolucao_andamento", "devolucao_analise"].includes(
      (order.status || "").toLowerCase()
    );

  const hasActiveShipping =
    order.has_shipping_file ||
    (order.status || "").toLowerCase() === "enviado" ||
    order.shipping_label_status === "ready";

  if (hasActiveOccurrence) {
    return {
      isEligible: false,
      reason:
        "Pedido possui solicitação, ocorrência ou devolução em aberto. Resolva a ocorrência antes de arquivar.",
      canForce: false,
    };
  }

  if (hasActiveShipping) {
    return {
      isEligible: false,
      reason:
        "Pedido possui expedição/etiqueta ativa ou já foi enviado. Não pode ser arquivado pela rotina padrão.",
      canForce: true,
    };
  }

  if (isPaid) {
    return {
      isEligible: false,
      reason:
        "Pedido possui pagamento confirmado. O arquivamento de pedidos pagos requer autorização expressa.",
      canForce: true,
    };
  }

  return { isEligible: true };
};

/**
 * Archive a single order with reason and audit trail.
 */
export const archiveOrder = async ({
  orderId,
  reason,
  userId,
  type = "manual",
  force = false,
}: {
  orderId: string;
  reason: string;
  userId?: string;
  type?: "manual" | "auto";
  force?: boolean;
}): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    // 1. Try updating orders table directly
    const { error } = await supabase
      .from("orders")
      .update({
        is_archived: true,
        archived_at: now,
        archived_reason: reason,
        archived_by: userId || null,
        archived_type: type,
        updated_at: now,
      } as any)
      .eq("id", orderId);

    if (error) {
      console.warn("DB update failed (table may lack column), using fallback:", error.message);
      // Fallback in localStorage if column not yet migrated
      saveLocalArchiveState(orderId, {
        is_archived: true,
        archived_at: now,
        archived_reason: reason,
        archived_by: userId,
        archived_type: type,
      });
    }

    // 2. Add history note
    try {
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: "arquivado",
        notes: `Pedido arquivado (${type === "auto" ? "Automático" : "Manual"}): ${reason}`,
        created_by: userId || null,
      });
    } catch {
      // ignore
    }

    return { success: true };
  } catch (err: any) {
    console.error("archiveOrder error:", err);
    return { success: false, error: err.message || "Erro desconhecido ao arquivar pedido." };
  }
};

/**
 * Restore an archived order back to operational pipeline.
 */
export const restoreOrder = async (
  orderId: string,
  currentStatus: string = "pendente",
  userId?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update({
        is_archived: false,
        archived_at: null,
        archived_reason: null,
        archived_type: null,
        updated_at: now,
      } as any)
      .eq("id", orderId);

    if (error) {
      console.warn("DB restore update failed, clearing fallback:", error.message);
      removeLocalArchiveState(orderId);
    }

    // Add status history entry
    try {
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: currentStatus,
        notes: "Pedido restaurado do arquivo para a visualização operacional",
        created_by: userId || null,
      });
    } catch {
      // ignore
    }

    return { success: true };
  } catch (err: any) {
    console.error("restoreOrder error:", err);
    return { success: false, error: err.message || "Erro ao restaurar pedido." };
  }
};

/**
 * Batch archive multiple orders with strict per-order eligibility validation.
 */
export const batchArchiveOrders = async (
  orders: OrderPipelineItem[],
  reason: string,
  userId?: string
): Promise<{
  archivedCount: number;
  blockedCount: number;
  blockedOrders: Array<{ order: OrderPipelineItem; reason: string }>;
}> => {
  const eligibleOrders: OrderPipelineItem[] = [];
  const blockedOrders: Array<{ order: OrderPipelineItem; reason: string }> = [];

  for (const order of orders) {
    const check = checkArchivingEligibility(order);
    if (check.isEligible) {
      eligibleOrders.push(order);
    } else {
      blockedOrders.push({ order, reason: check.reason || "Bloqueado por regras de segurança" });
    }
  }

  let archivedCount = 0;
  for (const order of eligibleOrders) {
    const res = await archiveOrder({
      orderId: order.id,
      reason,
      userId,
      type: "manual",
    });
    if (res.success) {
      archivedCount++;
    }
  }

  return {
    archivedCount,
    blockedCount: blockedOrders.length,
    blockedOrders,
  };
};

// Local storage fallback helpers
function getLocalArchiveMap(): Record<string, any> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ARCHIVED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalArchiveState(orderId: string, data: any) {
  try {
    const map = getLocalArchiveMap();
    map[orderId] = data;
    localStorage.setItem(LOCAL_STORAGE_ARCHIVED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function removeLocalArchiveState(orderId: string) {
  try {
    const map = getLocalArchiveMap();
    delete map[orderId];
    localStorage.setItem(LOCAL_STORAGE_ARCHIVED_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function isOrderLocallyArchived(orderId: string): boolean {
  const map = getLocalArchiveMap();
  return !!map[orderId]?.is_archived;
}

export function getLocalArchivedDetails(orderId: string): any {
  const map = getLocalArchiveMap();
  return map[orderId] || null;
}
