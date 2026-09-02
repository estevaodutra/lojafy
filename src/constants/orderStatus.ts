import {
  Clock,
  Inbox,
  Send,
  BadgeCheck,
  AlertTriangle,
  Package,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type OrderStatus =
  | "pendente"
  | "pago"
  | "recebido"
  | "embalado"
  | "enviado"
  | "finalizado"
  | "cancelado"
  | "etiqueta_incorreta";

export interface OrderStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pendente: { label: "Pedido Gerado > Aguardando Pagamento", icon: Clock, color: "bg-gray-100 text-gray-800", variant: "secondary" },
  pago: { label: "Pedido Pago > Aguardando Recebimento da Expedição", icon: BadgeCheck, color: "bg-emerald-100 text-emerald-800", variant: "default" },
  recebido: { label: "Pedido Recebido > Aguardando Envio", icon: Inbox, color: "bg-blue-100 text-blue-800", variant: "default" },
  embalado: { label: "Embalado > Aguardando Envio", icon: Package, color: "bg-orange-100 text-orange-800", variant: "default" },
  enviado: { label: "Pedido Enviado", icon: Send, color: "bg-purple-100 text-purple-800", variant: "secondary" },
  finalizado: { label: "Finalizado", icon: CheckCircle2, color: "bg-green-100 text-green-800", variant: "default" },
  cancelado: { label: "Cancelado", icon: XCircle, color: "bg-gray-200 text-gray-600", variant: "outline" },
  etiqueta_incorreta: { label: "Erro | Etiqueta Incorreta", icon: AlertTriangle, color: "bg-rose-100 text-rose-800 border border-rose-200", variant: "destructive" },
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendente: ["pago", "cancelado"],
  pago: ["recebido", "etiqueta_incorreta", "cancelado"],
  recebido: ["embalado", "enviado", "etiqueta_incorreta", "cancelado"],
  embalado: ["enviado", "etiqueta_incorreta", "cancelado"],
  etiqueta_incorreta: ["pago"],
  enviado: ["finalizado"],
  finalizado: [],
  cancelado: [],
};

// Status que o fornecedor pode selecionar
export const SUPPLIER_STATUSES: OrderStatus[] = [
  "recebido",
  "enviado",
  "etiqueta_incorreta",
];

// Todos os status (para admin)
export const ALL_STATUSES = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];

// Mensagens de notificação por status
export const STATUS_NOTIFICATION_MESSAGES: Record<OrderStatus, string> = {
  pendente: "⏳ Seu pedido #{numero} está aguardando pagamento.",
  pago: "✅ Pagamento confirmado! Seu pedido #{numero} está sendo processado.",
  recebido: "📥 Seu pedido #{numero} foi recebido pelo fornecedor.",
  embalado: "📦 Seu pedido #{numero} foi embalado e está pronto para envio.",
  enviado: "🚚 Seu pedido #{numero} foi enviado! Rastreio: {codigo}",
  finalizado: "🎉 Seu pedido #{numero} foi entregue. Obrigado pela compra!",
  cancelado: "❌ Seu pedido #{numero} foi cancelado.",
  etiqueta_incorreta: "⚠️ A etiqueta do seu pedido #{numero} está incorreta. Por favor, envie a nova etiqueta.",
};

// Status que notificam o revendedor
export const RESELLER_NOTIFY_STATUSES: OrderStatus[] = [
  "recebido",
  "enviado",
  "etiqueta_incorreta",
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
  requiresModal?: "reposicao" | "em_falta" | "cancelamento" | "devolucao";
  variant?: "default" | "outline" | "destructive";
}

export const SUPPLIER_QUICK_ACTIONS: QuickAction[] = [
  { label: "Recebi o Pedido", targetStatus: "recebido", showWhen: ["pago"], variant: "default" },
  { label: "Enviar", targetStatus: "enviado", showWhen: ["recebido"], variant: "default" },
];

// Motivos de cancelamento
export interface ReasonOption {
  code: string;
  label: string;
}

export const CANCELLATION_REASONS: ReasonOption[] = [
  { code: "cliente_desistiu", label: "Cliente Desistiu" },
  { code: "outro", label: "Outro" },
];

export const RETURN_REASONS: ReasonOption[] = [
  { code: "produto_defeito", label: "Produto com Defeito" },
  { code: "outro", label: "Outro" },
];

export const REASONS_REQUIRING_OBSERVATION = ["outro"];
