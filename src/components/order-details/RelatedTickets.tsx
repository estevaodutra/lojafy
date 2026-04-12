import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Ticket, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from '@/types/orderTickets';
import { useNavigate } from 'react-router-dom';

interface RelatedTicket {
  id: string;
  ticket_number: string;
  tipo: string;
  status: string;
  created_at: string;
}

interface RelatedTicketsProps {
  orderId: string;
}

export const RelatedTickets = ({ orderId }: RelatedTicketsProps) => {
  const [tickets, setTickets] = useState<RelatedTicket[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTickets = async () => {
      const { data } = await supabase
        .from('order_tickets')
        .select('id, ticket_number, tipo, status, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });
      setTickets(data || []);
    };
    fetchTickets();
  }, [orderId]);

  if (tickets.length === 0) return null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'aberto': return 'default';
      case 'em_analise': return 'secondary';
      case 'aguardando_cliente': return 'outline';
      case 'resolvido': return 'default';
      case 'cancelado': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Ticket className="h-4 w-4" />
          Tickets Relacionados ({tickets.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tickets.map(ticket => (
          <div key={ticket.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{ticket.ticket_number}</span>
                <Badge variant="outline" className="text-xs">
                  {TICKET_TYPE_LABELS[ticket.tipo as keyof typeof TICKET_TYPE_LABELS] || ticket.tipo}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(ticket.status) as any} className="text-xs">
                  {TICKET_STATUS_LABELS[ticket.status as keyof typeof TICKET_STATUS_LABELS] || ticket.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/minha-conta/tickets/${ticket.id}`)}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
