// Types for Order Tickets System

export type OrderTicketType = 'reembolso' | 'troca' | 'cancelamento' | 'verificacao_envio';
export type OrderTicketStatus = 'aberto' | 'em_analise' | 'aguardando_cliente' | 'resolvido' | 'cancelado';
export type TicketAuthorType = 'cliente' | 'revendedor' | 'fornecedor' | 'superadmin' | 'sistema';

export interface OrderTicket {
  id: string;
  order_id: string;
  ticket_number: string;
  tipo: OrderTicketType;
  status: OrderTicketStatus;
  customer_id: string;
  reseller_id: string | null;
  supplier_id: string | null;
  current_responsible: string | null;
  reason: string;
  resolution: string | null;
  refund_amount: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  sla_first_response: string | null;
  sla_resolution: string | null;
  first_responded_at: string | null;
  // Joined data
  order?: {
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
  };
  customer?: {
    first_name: string;
    last_name: string;
  };
  responsible?: {
    first_name: string;
    last_name: string;
  };
}

export interface OrderTicketMessage {
  id: string;
  ticket_id: string;
  author_id: string;
  author_type: TicketAuthorType;
  message: string;
  is_internal: boolean;
  created_at: string;
  // Joined data
  author?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export interface OrderTicketAttachment {
  id: string;
  ticket_id: string;
  message_id: string | null;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

export interface PendingRefund {
  id: string;
  ticket_id: string;
  customer_id: string;
  amount: number;
  status: 'pendente' | 'processando' | 'concluido' | 'cancelado';
  processed_at: string | null;
  processed_by: string | null;
  created_at: string;
}

export interface CreateTicketData {
  order_id: string;
  tipo: OrderTicketType;
  reason: string;
  attachments?: File[];
}

export interface TicketFilters {
  status?: OrderTicketStatus | 'all';
  tipo?: OrderTicketType | 'all';
  search?: string;
}

// SLA configuration per ticket type
export const SLA_CONFIG: Record<OrderTicketType, { firstResponse: number; resolution: number }> = {
  cancelamento: { firstResponse: 4, resolution: 24 },     // hours
  reembolso: { firstResponse: 24, resolution: 72 },       // hours
  troca: { firstResponse: 24, resolution: 168 },          // hours (7 days)
  verificacao_envio: { firstResponse: 12, resolution: 48 }, // hours (2 days)
};

// Get available ticket types based on order status
export const getAvailableTicketTypes = (
  orderStatus: string, 
  paymentStatus: string,
  deliveredAt?: string | null,
  paidAt?: string | null
): OrderTicketType[] => {
  const types: OrderTicketType[] = [];
  
  // Normalize statuses to cover both English and Portuguese
  const isPaidOrDelivered = ['confirmed', 'processing', 'shipped', 'delivered', 'pago', 'recebido', 'embalado', 'enviado', 'finalizado'].includes(orderStatus);
  const isBeforeShipping = ['confirmed', 'processing', 'pago', 'recebido', 'embalado'].includes(orderStatus);
  const isDelivered = ['delivered', 'finalizado'].includes(orderStatus);
  
  // Reembolso: available after payment confirmed
  if (isPaidOrDelivered && paymentStatus === 'paid') {
    types.push('reembolso');
  }
  
  // Troca: apenas para pedidos entregues, DENTRO de 7 dias após a entrega
  if (isDelivered && deliveredAt) {
    const deliveryDate = new Date(deliveredAt);
    const now = new Date();
    const daysSinceDelivery = Math.floor((now.getTime() - deliveryDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceDelivery <= 7) {
      types.push('troca');
    }
  }
  
  // Cancelamento: before shipping
  if (isBeforeShipping && paymentStatus === 'paid') {
    types.push('cancelamento');
  }

  // Verificação de status de envio: pago, antes do envio, e com mais de 24h passadas desde o pagamento
  if (paymentStatus === 'paid' && isBeforeShipping && paidAt) {
    const paidDate = new Date(paidAt);
    const now = new Date();
    const hoursSincePayment = (now.getTime() - paidDate.getTime()) / (1000 * 60 * 60);
    if (hoursSincePayment >= 24) {
      types.push('verificacao_envio');
    }
  }
  
  return types;
};

// Status labels in Portuguese
export const TICKET_STATUS_LABELS: Record<OrderTicketStatus, string> = {
  aberto: 'Aberto',
  em_analise: 'Em Análise',
  aguardando_cliente: 'Aguardando Cliente',
  resolvido: 'Resolvido',
  cancelado: 'Cancelado',
};

// Type labels in Portuguese
export const TICKET_TYPE_LABELS: Record<OrderTicketType, string> = {
  reembolso: 'Reembolso',
  troca: 'Troca',
  cancelamento: 'Cancelamento',
  verificacao_envio: 'Verificação de status de envio',
};

// Author type labels
export const AUTHOR_TYPE_LABELS: Record<TicketAuthorType, string> = {
  cliente: 'Cliente',
  revendedor: 'Loja',
  fornecedor: 'Fornecedor',
  superadmin: 'Suporte',
  sistema: 'Sistema',
};
