import { Card, CardContent } from '@/components/ui/card';
import { TicketStatusBadge } from './TicketStatusBadge';
import { TicketTypeBadge } from './TicketTypeBadge';
import { TicketSLABadge } from './TicketSLAIndicator';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Package } from 'lucide-react';
import type { OrderTicket } from '@/types/orderTickets';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: OrderTicket;
  onClick?: () => void;
  className?: string;
  showOrder?: boolean;
}

export const TicketCard = ({ ticket, onClick, className, showOrder = true }: TicketCardProps) => {
  return (
    <Card 
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm font-medium text-primary">
                {ticket.ticket_number}
              </span>
              <TicketTypeBadge tipo={ticket.tipo} showIcon={false} />
              <TicketStatusBadge status={ticket.status} showIcon={false} />
            </div>

            {/* Order info */}
            {showOrder && ticket.order && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                <Package className="h-3.5 w-3.5" />
                <span>Pedido #{ticket.order.order_number}</span>
              </div>
            )}

            {/* Reason preview */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {ticket.reason}
            </p>

            {/* Footer */}
            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
              <span>
                Aberto {formatDistanceToNow(new Date(ticket.created_at), { 
                  locale: ptBR, 
                  addSuffix: true 
                })}
              </span>
              {ticket.updated_at !== ticket.created_at && (
                <span>
                  Atualizado {formatDistanceToNow(new Date(ticket.updated_at), { 
                    locale: ptBR, 
                    addSuffix: true 
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <TicketSLABadge 
              slaDeadline={ticket.sla_resolution} 
              status={ticket.status} 
            />
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
