import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TicketListProps {
  onSelectTicket: (ticket: SupportTicket) => void;
  selectedTicketId?: string;
}

export const TicketList = ({ onSelectTicket, selectedTicketId }: TicketListProps) => {
  const { tickets, loading } = useSupportTickets();
  const [filter, setFilter] = useState<'all' | 'open' | 'waiting' | 'resolved'>('all');

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: any }> = {
      open: { label: 'Aberto', variant: 'default' },
      waiting_customer: { label: 'Aguardando Cliente', variant: 'secondary' },
      waiting_admin: { label: 'Aguardando Admin', variant: 'destructive' },
      resolved: { label: 'Resolvido', variant: 'outline' },
      closed: { label: 'Fechado', variant: 'outline' },
    };
    
    const config = variants[status] || { label: status, variant: 'default' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      urgent: { label: '🔴 Urgente', className: 'bg-red-100 text-red-800' },
      high: { label: '🟠 Alta', className: 'bg-orange-100 text-orange-800' },
      normal: { label: '🟡 Normal', className: 'bg-blue-100 text-blue-800' },
      low: { label: '⚪ Baixa', className: 'bg-gray-100 text-gray-800' },
    };
    
    const config = variants[priority] || variants.normal;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    if (filter === 'open') return ticket.status === 'open';
    if (filter === 'waiting') return ticket.status === 'waiting_admin';
    if (filter === 'resolved') return ticket.status === 'resolved' || ticket.status === 'closed';
    return true;
  });

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    waiting: tickets.filter(t => t.status === 'waiting_admin').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  if (loading) {
    return <Card className="p-4">Carregando tickets...</Card>;
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Tickets de Suporte</h3>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              <TabsTrigger value="open">Abertos ({counts.open})</TabsTrigger>
              <TabsTrigger value="waiting">Aguardando ({counts.waiting})</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos ({counts.resolved})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="h-[600px]">
          <div className="space-y-2">
            {filteredTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum ticket encontrado
              </p>
            ) : (
              filteredTickets.map(ticket => (
                <Card
                  key={ticket.id}
                  className={`p-3 cursor-pointer transition-colors hover:bg-accent ${
                    selectedTicketId === ticket.id ? 'bg-accent border-primary' : ''
                  }`}
                  onClick={() => onSelectTicket(ticket)}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {ticket.customer_email}
                        </p>
                      </div>
                      {ticket.ai_handled && (
                        <Badge variant="outline" className="text-xs">🤖 IA</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 flex-wrap">
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.last_message_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
};
