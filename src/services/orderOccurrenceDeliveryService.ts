import { supabase } from "@/integrations/supabase/client";
import { OrderPipelineItem, OrderPipelineStage } from "@/types/orderPipeline";

/**
 * Normaliza e identifica se uma etapa corresponde a 'Entrega Hoje'
 */
export function isEntregaHojeStage(stageNameOrKey: string): boolean {
  if (!stageNameOrKey) return false;
  const s = stageNameOrKey.toLowerCase().trim();
  return (
    s === "entrega_hoje" ||
    s === "entrega hoje" ||
    s.includes("entrega hoje") ||
    s.includes("hoje")
  );
}

/**
 * Normaliza e identifica se a etapa de ocorrência é permitida para o Revendedor (Seller).
 * O revendedor pode mexer nas 3 primeiras etapas:
 * 1. Nova Ocorrência
 * 2. Produto Enviado
 * 3. Entrega Hoje
 */
export function isOccurrenceStageAllowedForReseller(
  stage: OrderPipelineStage | { name?: string; status_key?: string },
  activeStages?: OrderPipelineStage[]
): boolean {
  if (!stage) return false;
  const sName = (stage.name || "").toLowerCase().trim();
  const sKey = (stage.status_key || "").toLowerCase().trim();

  // Etapa 1: Nova Ocorrência / Aberto
  if (
    sName.includes("nova") ||
    sName.includes("abert") ||
    sKey === "nova_ocorrencia" ||
    sKey === "aberto" ||
    sKey === "ocorrencia_aberta"
  ) {
    return true;
  }

  // Etapa 2: Produto Enviado / Devolução em Andamento
  if (
    sName.includes("enviado") ||
    sKey === "produto_enviado" ||
    sKey === "enviado" ||
    sKey === "devolucao_andamento"
  ) {
    return true;
  }

  // Etapa 3: Entrega Hoje
  if (isEntregaHojeStage(sName) || isEntregaHojeStage(sKey)) {
    return true;
  }

  // Se tiver a lista de etapas ativas ordenadas, checa se é uma das 3 primeiras
  if (activeStages && activeStages.length > 0) {
    const sorted = [...activeStages]
      .filter((s) => s.is_active)
      .sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex(
      (s) => s.name === stage.name || s.status_key === stage.status_key || (stage as any).id === s.id
    );
    if (idx >= 0 && idx < 3) {
      return true;
    }
  }

  return false;
}

/**
 * Envia notificação ao fornecedor informando que o produto está previsto para entregar hoje,
 * com o código de devolução/recebimento (se houver).
 * 
 * Mensagem requerida:
 * "Produto previsto para entregar hoje, código [código]" (ou "Produto previsto para entregar hoje" caso não tenha código).
 */
export async function notifySupplierOfDeliveryToday(
  order: OrderPipelineItem | any,
  returnCode?: string | null
): Promise<{ success: boolean; notifiedUsersCount: number }> {
  try {
    const orderId = order.id || order.raw?.id;
    const orderNumber = order.order_number || order.raw?.order_number || "";

    // 1. Descobrir os user_ids dos fornecedores associados
    const supplierUserIds = new Set<string>();

    const directSupplierId = order.supplier_id || order.raw?.supplier_id;
    if (directSupplierId) {
      supplierUserIds.add(directSupplierId);
    }

    const supplierOrgId =
      order.supplier_organization_id ||
      order.raw?.supplier_organization_id ||
      order.raw?.order_items?.[0]?.supplier_organization_id;

    if (supplierOrgId) {
      // Buscar membros da organização de fornecedor
      const { data: members, error: memErr } = await supabase
        .from("supplier_organization_members" as any)
        .select("user_id")
        .eq("organization_id", supplierOrgId);

      if (!memErr && members) {
        members.forEach((m: any) => {
          if (m.user_id) supplierUserIds.add(m.user_id);
        });
      }
    }

    // Se nenhum fornecedor direto foi mapeado, buscar o fornecedor dos itens do pedido no Supabase
    if (supplierUserIds.size === 0 && orderId) {
      const { data: orderWithItems } = await supabase
        .from("orders")
        .select(`
          supplier_id,
          supplier_organization_id,
          order_items (
            supplier_id,
            supplier_organization_id
          )
        `)
        .eq("id", orderId)
        .maybeSingle();

      if (orderWithItems) {
        if (orderWithItems.supplier_id) {
          supplierUserIds.add(orderWithItems.supplier_id);
        }
        if (orderWithItems.supplier_organization_id) {
          const { data: members } = await supabase
            .from("supplier_organization_members" as any)
            .select("user_id")
            .eq("organization_id", orderWithItems.supplier_organization_id);
          members?.forEach((m: any) => m.user_id && supplierUserIds.add(m.user_id));
        }
        if (Array.isArray(orderWithItems.order_items)) {
          for (const it of orderWithItems.order_items as any[]) {
            if (it.supplier_id) supplierUserIds.add(it.supplier_id);
            if (it.supplier_organization_id) {
              const { data: members } = await supabase
                .from("supplier_organization_members" as any)
                .select("user_id")
                .eq("organization_id", it.supplier_organization_id);
              members?.forEach((m: any) => m.user_id && supplierUserIds.add(m.user_id));
            }
          }
        }
      }
    }

    const cleanCode = (returnCode || "").trim();
    const notificationMessage = cleanCode
      ? `Produto previsto para entregar hoje, código ${cleanCode}`
      : `Produto previsto para entregar hoje`;

    const title = orderNumber
      ? `Pedido #${orderNumber}: Entrega Hoje`
      : `Entrega Prevista para Hoje`;

    // Inserir notificações para todos os fornecedores encontrados
    const notifPromises = Array.from(supplierUserIds).map((userId) =>
      supabase.from("notifications").insert({
        user_id: userId,
        title,
        message: notificationMessage,
        type: "occurrence_delivery_today",
        action_url: "/supplier/pedidos?tab=ocorrencias",
        action_label: "Ver Ocorrência",
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
          return_code: cleanCode || null,
        },
        is_read: false,
      })
    );

    if (notifPromises.length > 0) {
      await Promise.allSettled(notifPromises);
    }

    // Também registrar no ticket de suporte se existir
    const activeTicketId = order.active_ticket_id || order.raw?.active_ticket_id;
    if (activeTicketId) {
      const { data: session } = await supabase.auth.getSession();
      const currentUserId = session?.session?.user?.id;
      if (currentUserId) {
        await supabase.from("order_ticket_messages").insert({
          ticket_id: activeTicketId,
          author_id: currentUserId,
          author_type: "sistema",
          message: `[ETAPA ATUALIZADA: ENTREGA HOJE] ${notificationMessage}`,
        }).then(() => {}, () => {});
      }
    }

    return {
      success: true,
      notifiedUsersCount: supplierUserIds.size,
    };
  } catch (err) {
    console.error("Erro ao notificar fornecedor de entrega hoje:", err);
    return { success: false, notifiedUsersCount: 0 };
  }
}
