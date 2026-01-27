// Types for Order Tickets System

export type OrderTicketType = 'reembolso' | 'troca' | 'cancelamento';
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
};

// Get available ticket types based on order status
export const getAvailableTicketTypes = (orderStatus: string, paymentStatus: string): OrderTicketType[] => {
  const types: OrderTicketType[] = [];
  
  // Reembolso: available after payment confirmed
  if (['confirmed', 'processing', 'shipped', 'delivered'].includes(orderStatus) && paymentStatus === 'paid') {
    types.push('reembolso');
  }
  
  // Troca: only for shipped or delivered orders
  if (['shipped', 'delivered'].includes(orderStatus)) {
    types.push('troca');
  }
  
  // Cancelamento: before shipping
  if (['confirmed', 'processing'].includes(orderStatus) && paymentStatus === 'paid') {
    types.push('cancelamento');
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
};

// Author type labels
export const AUTHOR_TYPE_LABELS: Record<TicketAuthorType, string> = {
  cliente: 'Cliente',
  revendedor: 'Loja',
  fornecedor: 'Fornecedor',
  superadmin: 'Suporte',
  sistema: 'Sistema',
};
