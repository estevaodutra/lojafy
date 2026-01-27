import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrderTicketStatus } from '@/types/orderTickets';
import { TICKET_STATUS_LABELS } from '@/types/orderTickets';
import { Clock, CheckCircle, XCircle, AlertCircle, MessageCircle } from 'lucide-react';

interface TicketStatusBadgeProps {
  status: OrderTicketStatus;
  className?: string;
  showIcon?: boolean;
}

const statusConfig: Record<OrderTicketStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock; className: string }> = {
  aberto: {
    variant: 'default',
    icon: AlertCircle,
    className: 'bg-blue-500 hover:bg-blue-600',
  },
  em_analise: {
    variant: 'secondary',
    icon: Clock,
    className: 'bg-amber-500 hover:bg-amber-600 text-white',
  },
  aguardando_cliente: {
    variant: 'outline',
    icon: MessageCircle,
    className: 'border-orange-500 text-orange-600',
  },
  resolvido: {
    variant: 'secondary',
    icon: CheckCircle,
    className: 'bg-green-500 hover:bg-green-600 text-white',
  },
  cancelado: {
    variant: 'destructive',
    icon: XCircle,
    className: '',
  },
};

export const TicketStatusBadge = ({ status, className, showIcon = true }: TicketStatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn('gap-1', config.className, className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
};
