import { LucideIcon } from "lucide-react";
import { OrderStatus } from "@/constants/orderStatus";

export type PipelineType = "primary" | "occurrences";

export type OrderSortDirection =
  | "oldest_first"
  | "newest_first"
  | "longest_time_in_stage"
  | "shortest_time_in_stage";

export type OrderAgeCriteria = "created_at" | "stage_entered_at";

export interface OrderPipeline {
  id: string;
  key: PipelineType | string;
  name: string;
  description?: string | null;
  order_index: number;
  is_active: boolean;
  stages: OrderPipelineStage[];
}

export interface OrderPipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  status_key: string;
  order_index: number;
  color_class?: string | null;
  icon_name?: string | null;
  is_active: boolean;
}

export interface NormalizedOrderProduct {
  id?: string;
  name: string;
  imageUrl?: string;
  quantity: number;
}

export interface OrderPipelineItem {
  id: string;
  order_number: string;
  created_at: string;
  updated_at?: string;
  status: string; // Operational status (ex: 'pendente', 'pago', etc.)
  payment_status: "pending" | "paid" | "failed" | string;
  total_amount: number;

  // Financial fields (Custo vs Venda vs Lucro)
  supplier_cost: number; // Custo de fulfillment / fornecedor (valor real do Pix)
  sale_amount: number; // Valor vendido no canal/marketplace
  profit_amount: number; // Lucro estimado (venda - custo)
  is_marketplace: boolean; // Indica se é pedido de canal externo (ML, Shopee)
  
  // Archiving (Gestão de Arquivados)
  is_archived?: boolean;
  archived_at?: string | null;
  archived_reason?: string | null;
  archived_by?: string | null;
  archived_type?: "manual" | "auto" | null;

  // Stage Tracking (Controle de Tempo na Etapa)
  stage_entered_at?: string | null;
  time_in_stage_display?: string;

  // Identifiers & tracking
  external_reference?: string | null;
  tracking_number?: string | null;
  
  // Origin & channel badges
  channel: string; // 'mercadolivre' | 'shopee' | 'manual' | 'lojafy'
  channel_label: string; // 'ML', 'Shopee', 'Manual', 'Lojafy'
  origin_type: "AUTO" | "MANUAL";
  
  // Product info
  main_product?: NormalizedOrderProduct;
  total_items_count: number;
  total_quantity_count: number;
  
  // Parties
  seller_name: string;
  customer_name: string;
  customer_city?: string | null;
  customer_state?: string | null;
  shipping_address?: any;
  supplier_name: string;
  ml_order_id?: string | null;
  ml_shipment_id?: string | null;
  
  // Actions states
  pix_qr_code?: string | null;
  pix_qr_code_base64?: string | null;
  payment_expires_at?: string | null;
  has_shipping_file: boolean;
  ml_label_url?: string | null;
  shipping_label_status?: string | null;

  // Occurrences / Tickets context
  active_ticket_status?: string | null;
  active_ticket_type?: string | null;
  active_ticket_id?: string | null;
  has_solicitation?: boolean;
  solicitation_type?: string | null;
  
  // Raw order data if needed for modal
  raw?: any;
}

export interface PipelineFilters {
  searchTerm: string;
  marketplace: string;
  supplierId: string;
  sellerId: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  showArchived?: boolean;
}

export interface OrderPipelinePreferences {
  sort_direction: OrderSortDirection;
  age_criteria: OrderAgeCriteria;
  default_view: "pipeline" | "list";
}

export interface ArchivingEligibilityResult {
  isEligible: boolean;
  reason?: string;
  canForce?: boolean;
}

export interface OrderPipelineAutomation {
  id: string;
  name: string;
  description?: string | null;
  pipeline_key: string;
  stage_key: string;
  event_type: "stage_inactivity" | "stage_entered" | "status_changed";
  time_limit_hours: number;
  action_type: "archive" | "notify" | "webhook" | "custom";
  conditions: {
    require_unpaid?: boolean;
    block_with_open_ticket?: boolean;
    block_with_shipping_label?: boolean;
    min_order_amount?: number;
    max_order_amount?: number;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrderPipelineAutomationLog {
  id: string;
  automation_id?: string | null;
  order_id: string;
  order_number: string;
  action_taken: string;
  status: "success" | "blocked" | "failed";
  reason?: string | null;
  metadata?: any;
  created_at: string;
}

export interface OrderPipelineWebhook {
  id: string;
  name: string;
  url: string;
  secret_token?: string | null;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface AutomationSimulationResult {
  totalEvaluated: number;
  eligibleCount: number;
  blockedCount: number;
  eligibleOrders: OrderPipelineItem[];
  blockedOrders: Array<{
    order: OrderPipelineItem;
    reasons: string[];
  }>;
}
