import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useOrderTickets } from '@/hooks/useOrderTickets';
import { TicketCard } from '@/components/order-tickets/TicketCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Ticket, CheckCircle, Clock } from 'lucide-react';
import type { OrderTicketStatus } from '@/types/orderTickets';

const CustomerTickets = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderTicketStatus | 'all'>('all');

  const { tickets, isLoading, ticketCounts } = useOrderTickets({
    status: statusFilter,
    search,
  });

  const handleTicketClick = (ticketId: string) => {
    navigate(`/minha-conta/tickets/${ticketId}`);
  };

  const openCount = tickets.filter(t => t.status === 'aberto').length;
  const totalCount = tickets.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ticket className="h-6 w-6" />
          Meus Tickets
        </h1>
        <p className="text-muted-foreground mt-1">
          Acompanhe suas solicitações de reembolso, troca e cancelamento
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número do ticket..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as OrderTicketStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            Todos
            {totalCount > 0 && (
              <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
                {totalCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="aberto" className="gap-2">
            <Clock className="h-3.5 w-3.5" />
            Abertos
            {openCount > 0 && (
              <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                {openCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="em_analise" className="gap-2">
            Em Análise
          </TabsTrigger>
          <TabsTrigger value="resolvido" className="gap-2">
            <CheckCircle className="h-3.5 w-3.5" />
            Resolvidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Ticket className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum ticket encontrado</p>
              <p className="text-sm mt-1">
                {statusFilter === 'all' 
                  ? 'Você ainda não abriu nenhum ticket de suporte.'
                  : 'Não há tickets com este status.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <TicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onClick={() => handleTicketClick(ticket.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerTickets;
