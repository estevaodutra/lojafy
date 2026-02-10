import {
  Clock,
  Inbox,
  Settings,
  Package,
  Send,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Ban,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

export type OrderStatus =
  | "pendente"
  | "recebido"
  | "em_preparacao"
  | "embalado"
  | "enviado"
  | "em_reposicao"
  | "em_falta"
  | "finalizado"
  | "cancelado"
  | "reembolsado";

export interface OrderStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pendente: { label: "Pendente", icon: Clock, color: "bg-gray-100 text-gray-800", variant: "secondary" },
  recebido: { label: "Recebido", icon: Inbox, color: "bg-blue-100 text-blue-800", variant: "default" },
  em_preparacao: { label: "Em Preparação", icon: Settings, color: "bg-yellow-100 text-yellow-800", variant: "outline" },
  embalado: { label: "Embalado", icon: Package, color: "bg-orange-100 text-orange-800", variant: "default" },
  enviado: { label: "Enviado", icon: Send, color: "bg-purple-100 text-purple-800", variant: "secondary" },
  em_reposicao: { label: "Em Reposição", icon: AlertTriangle, color: "bg-amber-100 text-amber-800", variant: "outline" },
  em_falta: { label: "Em Falta", icon: XCircle, color: "bg-red-100 text-red-800", variant: "destructive" },
  finalizado: { label: "Finalizado", icon: CheckCircle, color: "bg-green-100 text-green-800", variant: "default" },
  cancelado: { label: "Cancelado", icon: Ban, color: "bg-gray-100 text-gray-800", variant: "destructive" },
  reembolsado: { label: "Reembolsado", icon: RefreshCw, color: "bg-gray-100 text-gray-800", variant: "secondary" },
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendente: ["recebido", "cancelado"],
  recebido: ["em_preparacao", "em_falta", "cancelado"],
  em_preparacao: ["embalado", "em_reposicao", "em_falta", "cancelado"],
  embalado: ["enviado", "em_reposicao", "cancelado"],
  enviado: ["finalizado", "cancelado"],
  em_reposicao: ["em_preparacao", "embalado", "enviado", "cancelado"],
  em_falta: ["cancelado", "reembolsado"],
  finalizado: ["reembolsado"],
  cancelado: ["reembolsado"],
  reembolsado: [],
};

// Status que o fornecedor pode selecionar
export const SUPPLIER_STATUSES: OrderStatus[] = [
  "recebido",
  "em_preparacao",
  "embalado",
  "enviado",
  "em_reposicao",
  "em_falta",
];

// Todos os status (para admin)
export const ALL_STATUSES = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];

// Mensagens de notificação por status
export const STATUS_NOTIFICATION_MESSAGES: Record<OrderStatus, string> = {
  pendente: "Seu pedido #{numero} está aguardando pagamento.",
  recebido: "Seu pedido #{numero} foi recebido pelo fornecedor e está sendo processado.",
  em_preparacao: "Seu pedido #{numero} está sendo preparado.",
  embalado: "Seu pedido #{numero} está embalado e pronto para envio.",
  enviado: "Seu pedido #{numero} foi enviado! Código de rastreio: {codigo}",
  em_reposicao: "Seu pedido #{numero} está em reposição. Nova previsão de envio: {data}.",
  em_falta: "Infelizmente o produto do pedido #{numero} está em falta. Entraremos em contato sobre o reembolso.",
  finalizado: "Seu pedido #{numero} foi entregue. Obrigado pela compra!",
  cancelado: "Seu pedido #{numero} foi cancelado.",
  reembolsado: "O reembolso do pedido #{numero} foi processado.",
};

// Status que notificam o revendedor
export const RESELLER_NOTIFY_STATUSES: OrderStatus[] = [
  "em_reposicao",
  "em_falta",
  "cancelado",
  "reembolsado",
];

// Helper functions
export function getStatusConfig(status: string): OrderStatusConfig {
  return ORDER_STATUS_CONFIG[status as OrderStatus] || ORDER_STATUS_CONFIG.pendente;
}

export function getStatusLabel(status: string): string {
  return getStatusConfig(status).label;
}

export function getStatusVariant(status: string): OrderStatusConfig["variant"] {
  return getStatusConfig(status).variant;
}

export function getStatusIcon(status: string): LucideIcon {
  return getStatusConfig(status).icon;
}

export function getAvailableTransitions(currentStatus: string): OrderStatus[] {
  return STATUS_TRANSITIONS[currentStatus as OrderStatus] || [];
}

// Ações rápidas do fornecedor
export interface QuickAction {
  label: string;
  targetStatus: OrderStatus;
  showWhen: OrderStatus[];
  requiresModal?: "reposicao" | "em_falta";
  variant?: "default" | "outline" | "destructive";
}

export const SUPPLIER_QUICK_ACTIONS: QuickAction[] = [
  { label: "Recebi o Pedido", targetStatus: "recebido", showWhen: ["pendente"], variant: "default" },
  { label: "Preparando", targetStatus: "em_preparacao", showWhen: ["recebido"], variant: "default" },
  { label: "Embalado", targetStatus: "embalado", showWhen: ["em_preparacao"], variant: "default" },
  { label: "Enviar", targetStatus: "enviado", showWhen: ["embalado"], variant: "default" },
  { label: "Em Reposição", targetStatus: "em_reposicao", showWhen: ["em_preparacao", "embalado"], requiresModal: "reposicao", variant: "outline" },
  { label: "Em Falta", targetStatus: "em_falta", showWhen: ["recebido", "em_preparacao"], requiresModal: "em_falta", variant: "destructive" },
];
