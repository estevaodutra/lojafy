import {
  Clock,
  Inbox,
  Package,
  Send,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Ban,
  RefreshCw,
  BadgeCheck,
  RotateCcw,
  PackageOpen,
  HandMetal,
  Search,
  ThumbsUp,
  type LucideIcon,
} from "lucide-react";

export type OrderStatus =
  | "pendente"
  | "pago"
  | "recebido"
  | "embalado"
  | "enviado"
  | "finalizado"
  | "em_reposicao"
  | "em_falta"
  | "cancelamento_solicitado"
  | "cancelado"
  | "devolucao_andamento"
  | "devolucao_recebida"
  | "devolucao_analise"
  | "devolucao_aprovada"
  | "reembolsado";

export interface OrderStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  variant: "default" | "secondary" | "outline" | "destructive";
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pendente: { label: "Aguardando Pagamento", icon: Clock, color: "bg-gray-100 text-gray-800", variant: "secondary" },
  pago: { label: "Aguardando Recebimento da Expedição", icon: BadgeCheck, color: "bg-emerald-100 text-emerald-800", variant: "default" },
  recebido: { label: "Pedido Recebido > Aguardando Envio", icon: Inbox, color: "bg-blue-100 text-blue-800", variant: "default" },
  embalado: { label: "Embalado > Aguardando Envio", icon: Package, color: "bg-orange-100 text-orange-800", variant: "default" },
  enviado: { label: "Enviado", icon: Send, color: "bg-purple-100 text-purple-800", variant: "secondary" },
  finalizado: { label: "Finalizado", icon: CheckCircle, color: "bg-green-100 text-green-800", variant: "default" },
  em_reposicao: { label: "Atraso | Em Reposição", icon: AlertTriangle, color: "bg-amber-100 text-amber-800", variant: "outline" },
  em_falta: { label: "Cancelado | Em Falta", icon: XCircle, color: "bg-red-100 text-red-800", variant: "destructive" },
  cancelamento_solicitado: { label: "Solicitação de Cancelamento", icon: HandMetal, color: "bg-rose-100 text-rose-800", variant: "outline" },
  cancelado: { label: "Cancelado", icon: Ban, color: "bg-gray-100 text-gray-800", variant: "destructive" },
  devolucao_andamento: { label: "Devolução em Andamento", icon: RotateCcw, color: "bg-rose-100 text-rose-800", variant: "outline" },
  devolucao_recebida: { label: "Devolução Recebida", icon: PackageOpen, color: "bg-rose-100 text-rose-800", variant: "secondary" },
  devolucao_analise: { label: "Devolução em Análise", icon: Search, color: "bg-indigo-100 text-indigo-800", variant: "outline" },
  devolucao_aprovada: { label: "Devolução Aprovada", icon: ThumbsUp, color: "bg-indigo-100 text-indigo-800", variant: "default" },
  reembolsado: { label: "Reembolsado", icon: RefreshCw, color: "bg-gray-100 text-gray-800", variant: "secondary" },
};

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pendente: ["pago", "cancelamento_solicitado"],
  pago: ["recebido", "cancelamento_solicitado"],
  recebido: ["embalado", "em_reposicao", "em_falta", "cancelamento_solicitado"],
  embalado: ["enviado", "em_reposicao", "cancelamento_solicitado"],
  em_reposicao: ["embalado", "enviado", "cancelamento_solicitado"],
  enviado: ["finalizado", "cancelamento_solicitado"],
  finalizado: ["devolucao_andamento"],
  cancelamento_solicitado: ["cancelado", "enviado"],
  cancelado: ["reembolsado"],
  em_falta: [],
  devolucao_andamento: ["devolucao_recebida"],
  devolucao_recebida: ["devolucao_analise"],
  devolucao_analise: ["devolucao_aprovada"],
  devolucao_aprovada: ["reembolsado"],
  reembolsado: [],
};

// Status que o fornecedor pode selecionar
export const SUPPLIER_STATUSES: OrderStatus[] = [
  "recebido",
  "embalado",
  "enviado",
  "em_reposicao",
  "em_falta",
];

// Todos os status (para admin)
export const ALL_STATUSES = Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[];

// Mensagens de notificação por status
export const STATUS_NOTIFICATION_MESSAGES: Record<OrderStatus, string> = {
  pendente: "⏳ Seu pedido #{numero} está aguardando pagamento.",
  pago: "✅ Pagamento confirmado! Seu pedido #{numero} está sendo processado.",
  recebido: "📥 Seu pedido #{numero} foi recebido pelo fornecedor.",
  embalado: "📦 Seu pedido #{numero} está embalado e pronto para envio.",
  enviado: "🚚 Seu pedido #{numero} foi enviado! Rastreio: {codigo}",
  finalizado: "✔️ Seu pedido #{numero} foi entregue. Obrigado pela compra!",
  em_reposicao: "⚠️ Seu pedido #{numero} está em atraso. Acesse seus pedidos para mais informações.",
  em_falta: "❌ Pedido #{numero} cancelado por falta de estoque. R$ {valor} creditado na sua carteira.",
  cancelamento_solicitado: "🙋 Cancelamento solicitado para o pedido #{numero}.",
  cancelado: "🚫 Seu pedido #{numero} foi cancelado. Motivo: {motivo}",
  devolucao_andamento: "🔄 Devolução do pedido #{numero} em andamento.",
  devolucao_recebida: "📬 Devolução do pedido #{numero} foi recebida.",
  devolucao_analise: "🔍 Devolução do pedido #{numero} está em análise.",
  devolucao_aprovada: "✅ Devolução aprovada! R$ {valor} creditado na sua carteira.",
  reembolsado: "💸 Reembolso de R$ {valor} do pedido #{numero} processado.",
};

// Status que notificam o revendedor
export const RESELLER_NOTIFY_STATUSES: OrderStatus[] = [
  "em_reposicao",
  "em_falta",
  "cancelado",
  "reembolsado",
  "cancelamento_solicitado",
  "devolucao_analise",
  "devolucao_aprovada",
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
  { label: "Embalar", targetStatus: "embalado", showWhen: ["recebido", "em_reposicao"], variant: "default" },
  { label: "Enviar", targetStatus: "enviado", showWhen: ["embalado", "em_reposicao"], variant: "default" },
  { label: "Finalizar", targetStatus: "finalizado", showWhen: ["enviado"], variant: "default" },
  { label: "Atraso/Reposição", targetStatus: "em_reposicao", showWhen: ["recebido", "embalado"], requiresModal: "reposicao", variant: "outline" },
  { label: "Em Falta", targetStatus: "em_falta", showWhen: ["recebido"], requiresModal: "em_falta", variant: "destructive" },
  { label: "Devolução", targetStatus: "devolucao_andamento", showWhen: ["finalizado"], requiresModal: "devolucao", variant: "outline" },
  { label: "Confirmar Recebimento", targetStatus: "devolucao_recebida", showWhen: ["devolucao_andamento"], variant: "default" },
  { label: "Reembolsar", targetStatus: "reembolsado", showWhen: ["devolucao_aprovada", "cancelado"], variant: "destructive" },
];

// Motivos de cancelamento
export interface ReasonOption {
  code: string;
  label: string;
}

export const CANCELLATION_REASONS: ReasonOption[] = [
  { code: "cliente_desistiu", label: "Cliente Desistiu" },
  { code: "cliente_recusou_atraso", label: "Cliente Recusou Atraso" },
  { code: "pagamento_nao_confirmado", label: "Pagamento Não Confirmado" },
  { code: "estoque_falta", label: "Falta de Estoque" },
  { code: "fraude", label: "Fraude Detectada" },
  { code: "erro_pedido", label: "Erro no Pedido" },
  { code: "solicitacao_revendedor", label: "Solicitação do Revendedor" },
  { code: "devolucao_negada", label: "Devolução Negada" },
  { code: "outro", label: "Outro" },
];

export const RETURN_REASONS: ReasonOption[] = [
  { code: "produto_defeito", label: "Produto com Defeito" },
  { code: "produto_errado", label: "Produto Errado Enviado" },
  { code: "nao_gostou", label: "Não Gostou / Arrependimento" },
  { code: "danificado_transporte", label: "Danificado no Transporte" },
  { code: "outro", label: "Outro" },
];

export const REASONS_REQUIRING_OBSERVATION = ["erro_pedido", "fraude", "devolucao_negada", "outro"];
