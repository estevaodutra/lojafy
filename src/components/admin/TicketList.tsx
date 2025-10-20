import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare } from 'lucide-react';

interface TicketListProps {
  onSelectTicket: (ticket: SupportTicket) => void;
  selectedTicketId?: string;
}

export const TicketList = ({ onSelectTicket, selectedTicketId }: TicketListProps) => {
  const { tickets, loading, refetch } = useSupportTickets();
  const [filter, setFilter] = useState<'all' | 'open' | 'waiting' | 'resolved'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

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

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Tickets de Suporte</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
              <TabsTrigger value="open">Abertos ({counts.open})</TabsTrigger>
              <TabsTrigger value="waiting">Aguardando ({counts.waiting})</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidos ({counts.resolved})</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

      </div>

      <ScrollArea className="flex-1 px-4">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando tickets...</p>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">Nenhum ticket encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filter !== 'all' ? 'Tente outro filtro' : 'Nenhum ticket criado ainda'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {filteredTickets.map(ticket => (
              <Card
                key={ticket.id}
                onClick={() => {
                  console.log('🎯 [TicketList] Ticket clicked:', ticket.id);
                  console.log('📧 [TicketList] Customer email:', ticket.customer_email);
                  console.log('📋 [TicketList] Subject:', ticket.subject);
                  onSelectTicket(ticket);
                }}
                className={`p-3 cursor-pointer transition-colors ${
                  selectedTicketId === ticket.id 
                    ? 'bg-blue-100 border-l-4 border-blue-500' 
                    : 'hover:bg-accent'
                }`}
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
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
