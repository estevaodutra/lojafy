import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderTicketType } from '@/types/orderTickets';
import { TICKET_TYPE_LABELS } from '@/types/orderTickets';
import { RefreshCw, DollarSign, Ban } from 'lucide-react';

interface TicketTypeBadgeProps {
  tipo: OrderTicketType;
  className?: string;
  showIcon?: boolean;
}

const typeConfig: Record<OrderTicketType, { icon: typeof DollarSign; className: string }> = {
  reembolso: {
    icon: DollarSign,
    className: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
  },
  troca: {
    icon: RefreshCw,
    className: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
  },
  cancelamento: {
    icon: Ban,
    className: 'bg-red-100 text-red-700 hover:bg-red-200',
  },
};

export const TicketTypeBadge = ({ tipo, className, showIcon = true }: TicketTypeBadgeProps) => {
  const config = typeConfig[tipo];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn('gap-1 border-0', config.className, className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {TICKET_TYPE_LABELS[tipo]}
    </Badge>
  );
};
