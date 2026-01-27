import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useOrderTickets } from '@/hooks/useOrderTickets';
import { useOrderTicketMessages } from '@/hooks/useOrderTicketMessages';
import { TicketTimeline } from '@/components/order-tickets/TicketTimeline';
import { TicketStatusBadge } from '@/components/order-tickets/TicketStatusBadge';
import { TicketTypeBadge } from '@/components/order-tickets/TicketTypeBadge';
import { TicketSLAIndicator } from '@/components/order-tickets/TicketSLAIndicator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, Package, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { OrderTicket } from '@/types/orderTickets';

const CustomerTicketDetails = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<OrderTicket | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const { getTicketById } = useOrderTickets();
  const { messages, isLoading: messagesLoading, sendMessage, isSending } = useOrderTicketMessages(ticketId || null);

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) return;
      setLoading(true);
      const data = await getTicketById(ticketId);
      setTicket(data);
      setLoading(false);
    };
    fetchTicket();
  }, [ticketId]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || isSending) return;
    sendMessage(
      { message: newMessage.trim() },
      { onSuccess: () => setNewMessage('') }
    );
  };

  const isResolved = ticket?.status === 'resolvido' || ticket?.status === 'cancelado';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium text-muted-foreground">Ticket não encontrado</p>
        <Button variant="outline" onClick={() => navigate('/minha-conta/tickets')} className="mt-4">
          Voltar para Meus Tickets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/minha-conta/tickets')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold font-mono">{ticket.ticket_number}</h1>
              <TicketTypeBadge tipo={ticket.tipo} />
              <TicketStatusBadge status={ticket.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Aberto em {format(new Date(ticket.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>

        {/* SLA Indicator */}
        <TicketSLAIndicator 
          slaDeadline={ticket.sla_resolution} 
          status={ticket.status} 
        />

        {/* Order Info */}
        {ticket.order && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4" />
                Pedido Vinculado
              </CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <span className="font-mono">#{ticket.order.order_number}</span>
                <span className="text-sm text-muted-foreground capitalize">
                  {ticket.order.status}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolution (if resolved) */}
        {ticket.resolution && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Resolução</CardTitle>
            </CardHeader>
            <CardContent className="py-3">
              <p className="text-sm">{ticket.resolution}</p>
              {ticket.refund_amount && ticket.refund_amount > 0 && (
                <p className="text-sm font-medium text-primary mt-2">
                  Valor do reembolso: R$ {ticket.refund_amount.toFixed(2)}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Messages Timeline */}
        <div>
          <h2 className="font-medium mb-4">Conversas</h2>
          <TicketTimeline messages={messages} isLoading={messagesLoading} />
        </div>

        {!isResolved && (
          <div className="space-y-2">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        )}
      </div>
  );
};

export default CustomerTicketDetails;
