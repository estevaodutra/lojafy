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
  BadgeCheck,
  RotateCcw,
  ArrowLeftRight,
  PackageOpen,
  Repeat,
  type LucideIcon,
} from "lucide-react";

export type OrderStatus =
  | "pendente"
  | "pago"
  | "recebido"
  | "em_preparacao"
  | "embalado"
  | "enviado"
  | "em_reposicao"
  | "em_falta"
  | "finalizado"
  | "cancelado"
  | "reembolsado"
  | "devolucao_solicitada"
  | "em_devolucao"
  | "troca_solicitada"
  | "em_troca";

export interface OrderStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pendente: { label: "Pendente", icon: Clock, color: "bg-gray-100 text-gray-800", variant: "secondary" },
  pago: { label: "Pago", icon: BadgeCheck, color: "bg-emerald-100 text-emerald-800", variant: "default" },
  recebido: { label: "Recebido", icon: Inbox, color: "bg-blue-100 text-blue-800", variant: "default" },
  em_preparacao: { label: "Em Preparação", icon: Settings, color: "bg-yellow-100 text-yellow-800", variant: "outline" },
  embalado: { label: "Embalado", icon: Package, color: "bg-orange-100 text-orange-800", variant: "default" },
  enviado: { label: "Enviado", icon: Send, color: "bg-purple-100 text-purple-800", variant: "secondary" },
  em_reposicao: { label: "Em Reposição", icon: AlertTriangle, color: "bg-amber-100 text-amber-800", variant: "outline" },
  em_falta: { label: "Em Falta", icon: XCircle, color: "bg-red-100 text-red-800", variant: "destructive" },
  finalizado: { label: "Finalizado", icon: CheckCircle, color: "bg-green-100 text-green-800", variant: "default" },
  cancelado: { label: "Cancelado", icon: Ban, color: "bg-gray-100 text-gray-800", variant: "destructive" },
  reembolsado: { label: "Reembolsado", icon: RefreshCw, color: "bg-gray-100 text-gray-800", variant: "secondary" },
  devolucao_solicitada: { label: "Devolução Solicitada", icon: RotateCcw, color: "bg-rose-100 text-rose-800", variant: "outline" },
  em_devolucao: { label: "Em Devolução", icon: PackageOpen, color: "bg-rose-100 text-rose-800", variant: "secondary" },
  troca_solicitada: { label: "Troca Solicitada", icon: ArrowLeftRight, color: "bg-indigo-100 text-indigo-800", variant: "outline" },
  em_troca: { label: "Em Troca", icon: Repeat, color: "bg-indigo-100 text-indigo-800", variant: "secondary" },
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendente: ["pago", "cancelado"],
  pago: ["recebido", "cancelado"],
  recebido: ["em_preparacao", "em_reposicao", "em_falta", "cancelado"],
  em_preparacao: ["embalado", "em_reposicao", "em_falta", "cancelado"],
  em_reposicao: ["em_preparacao", "embalado", "cancelado"],
  embalado: ["enviado", "cancelado"],
  enviado: ["finalizado", "cancelado"],
  em_falta: ["cancelado"],
  finalizado: ["devolucao_solicitada", "troca_solicitada", "reembolsado"],
  devolucao_solicitada: ["em_devolucao", "cancelado"],
  em_devolucao: ["reembolsado"],
  troca_solicitada: ["em_troca", "cancelado"],
  em_troca: ["finalizado"],
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
  pago: "Pagamento confirmado! Seu pedido #{numero} está sendo processado.",
  recebido: "Seu pedido #{numero} foi recebido pelo fornecedor e está sendo processado.",
  em_preparacao: "Seu pedido #{numero} está sendo preparado.",
  embalado: "Seu pedido #{numero} está embalado e pronto para envio.",
  enviado: "Seu pedido #{numero} foi enviado! Código de rastreio: {codigo}",
  em_reposicao: "Seu pedido #{numero} está em reposição. Nova previsão de envio: {data}.",
  em_falta: "Infelizmente o produto do pedido #{numero} está em falta. Entraremos em contato sobre o reembolso.",
  finalizado: "Seu pedido #{numero} foi entregue. Obrigado pela compra!",
  cancelado: "Seu pedido #{numero} foi cancelado. Motivo: {motivo}",
  reembolsado: "O reembolso do pedido #{numero} foi processado.",
  devolucao_solicitada: "Sua solicitação de devolução do pedido #{numero} foi registrada.",
  em_devolucao: "Estamos aguardando o retorno do produto do pedido #{numero}.",
  troca_solicitada: "Sua solicitação de troca do pedido #{numero} foi registrada.",
  em_troca: "A troca do pedido #{numero} está em andamento.",
};

// Status que notificam o revendedor
export const RESELLER_NOTIFY_STATUSES: OrderStatus[] = [
  "em_reposicao",
  "em_falta",
  "cancelado",
  "reembolsado",
  "devolucao_solicitada",
  "troca_solicitada",
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
  requiresModal?: "reposicao" | "em_falta" | "cancelamento" | "devolucao" | "troca";
  variant?: "default" | "outline" | "destructive";
}

export const SUPPLIER_QUICK_ACTIONS: QuickAction[] = [
  { label: "Recebi o Pedido", targetStatus: "recebido", showWhen: ["pago"], variant: "default" },
  { label: "Preparando", targetStatus: "em_preparacao", showWhen: ["recebido"], variant: "default" },
  { label: "Embalado", targetStatus: "embalado", showWhen: ["em_preparacao"], variant: "default" },
  { label: "Enviar", targetStatus: "enviado", showWhen: ["embalado"], variant: "default" },
  { label: "Finalizar", targetStatus: "finalizado", showWhen: ["enviado"], variant: "default" },
  { label: "Em Reposição", targetStatus: "em_reposicao", showWhen: ["em_preparacao", "embalado"], requiresModal: "reposicao", variant: "outline" },
  { label: "Em Falta", targetStatus: "em_falta", showWhen: ["recebido", "em_preparacao"], requiresModal: "em_falta", variant: "destructive" },
  { label: "Devolução", targetStatus: "devolucao_solicitada", showWhen: ["finalizado"], requiresModal: "devolucao", variant: "outline" },
  { label: "Troca", targetStatus: "troca_solicitada", showWhen: ["finalizado"], requiresModal: "troca", variant: "outline" },
  { label: "Em Devolução", targetStatus: "em_devolucao", showWhen: ["devolucao_solicitada"], variant: "default" },
  { label: "Em Troca", targetStatus: "em_troca", showWhen: ["troca_solicitada"], variant: "default" },
  { label: "Reembolsar", targetStatus: "reembolsado", showWhen: ["em_devolucao", "cancelado"], variant: "destructive" },
];

// Motivos de cancelamento
export interface ReasonOption {
  code: string;
  label: string;
}

export const CANCELLATION_REASONS: ReasonOption[] = [
  { code: "cliente_desistiu", label: "Cliente Desistiu" },
  { code: "pagamento_nao_confirmado", label: "Pagamento Não Confirmado" },
  { code: "estoque", label: "Falta de Estoque" },
  { code: "fraude", label: "Fraude Detectada" },
  { code: "erro_pedido", label: "Erro no Pedido" },
  { code: "outro", label: "Outro" },
];

export const RETURN_REASONS: ReasonOption[] = [
  { code: "produto_defeito", label: "Produto com Defeito" },
  { code: "produto_errado", label: "Produto Errado Enviado" },
  { code: "nao_gostou", label: "Não Gostou / Arrependimento" },
  { code: "danificado_transporte", label: "Danificado no Transporte" },
  { code: "outro", label: "Outro" },
];

export const EXCHANGE_REASONS: ReasonOption[] = [
  { code: "tamanho", label: "Tamanho Errado" },
  { code: "cor", label: "Cor Diferente" },
  { code: "produto_defeito", label: "Produto com Defeito" },
  { code: "outro", label: "Outro" },
];

export const REASONS_REQUIRING_OBSERVATION = ["erro_pedido", "outro"];
