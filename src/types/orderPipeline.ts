import { LucideIcon } from "lucide-react";
import { OrderStatus } from "@/constants/orderStatus";

export type PipelineType = "primary" | "occurrences";

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
  status: string; // Operational status (ex: 'pendente', 'pago', etc.)
  payment_status: "pending" | "paid" | "failed" | string;
  total_amount: number;
  
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
}
