import {
  Inbox,
  Hand,
  PackageCheck,
  Package,
  PackageOpen,
  Tag,
  Send,
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';

export type FulfillmentStatus =
  | 'awaiting_picking'
  | 'picking'
  | 'picked'
  | 'packing'
  | 'packed'
  | 'label_ready'
  | 'shipped'
  | 'in_transit'
  | 'delivered'
  | 'occurrence'
  | 'cancelled'
  | 'returned';

export interface FulfillmentStatusConfig {
  label: string;
  icon: LucideIcon;
  color: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
}

export const FULFILLMENT_STATUS_CONFIG: Record<FulfillmentStatus, FulfillmentStatusConfig> = {
  awaiting_picking: { label: 'Aguardando Separação', icon: Inbox, color: 'bg-gray-100 text-gray-800', variant: 'secondary' },
  picking: { label: 'Em Separação', icon: Hand, color: 'bg-blue-100 text-blue-800', variant: 'default' },
  picked: { label: 'Separado', icon: PackageCheck, color: 'bg-blue-100 text-blue-800', variant: 'default' },
  packing: { label: 'Em Embalagem', icon: PackageOpen, color: 'bg-orange-100 text-orange-800', variant: 'default' },
  packed: { label: 'Embalado', icon: Package, color: 'bg-orange-100 text-orange-800', variant: 'default' },
  label_ready: { label: 'Etiqueta Pronta', icon: Tag, color: 'bg-amber-100 text-amber-800', variant: 'default' },
  shipped: { label: 'Enviado', icon: Send, color: 'bg-purple-100 text-purple-800', variant: 'secondary' },
  in_transit: { label: 'Em Trânsito', icon: Truck, color: 'bg-purple-100 text-purple-800', variant: 'secondary' },
  delivered: { label: 'Entregue', icon: CheckCircle2, color: 'bg-green-100 text-green-800', variant: 'default' },
  occurrence: { label: 'Com Ocorrência', icon: AlertTriangle, color: 'bg-rose-100 text-rose-800', variant: 'destructive' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'bg-gray-200 text-gray-600', variant: 'outline' },
  returned: { label: 'Devolvido', icon: RotateCcw, color: 'bg-rose-100 text-rose-800', variant: 'destructive' },
};

/** Transições que o fornecedor pode executar (espelha validate_fulfillment_transition no banco). */
export const FULFILLMENT_TRANSITIONS: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  awaiting_picking: ['picking', 'occurrence', 'cancelled'],
  picking: ['picked', 'occurrence', 'cancelled'],
  picked: ['packing', 'occurrence', 'cancelled'],
  packing: ['packed', 'occurrence', 'cancelled'],
  packed: ['label_ready', 'occurrence', 'cancelled'],
  label_ready: ['shipped', 'occurrence', 'cancelled'],
  shipped: ['in_transit', 'delivered', 'occurrence'],
  in_transit: ['delivered', 'occurrence'],
  delivered: ['returned'],
  occurrence: ['awaiting_picking', 'picking', 'picked', 'packing', 'packed', 'label_ready', 'cancelled'],
  cancelled: [],
  returned: [],
};

/** Status considerados "pré-envio" — reservam estoque. */
export const PRE_SHIPMENT_STATUSES: FulfillmentStatus[] = [
  'awaiting_picking', 'picking', 'picked', 'packing', 'packed', 'label_ready',
];

export const getFulfillmentStatusConfig = (status: string): FulfillmentStatusConfig =>
  FULFILLMENT_STATUS_CONFIG[status as FulfillmentStatus] ?? {
    label: status,
    icon: AlertTriangle,
    color: 'bg-gray-100 text-gray-800',
    variant: 'outline',
  };
