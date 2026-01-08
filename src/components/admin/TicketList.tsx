import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportTickets, SupportTicket } from '@/hooks/useSupportTickets';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, MessageSquare, Search } from 'lucide-react';
import { ChatAvatar } from './ChatAvatar';
import { SUPPORT_CATEGORIES, getCategoryById } from '@/constants/supportCategories';

interface TicketListProps {
  onSelectTicket: (ticket: SupportTicket) => void;
  selectedTicketId?: string;
}

export const TicketList = ({ onSelectTicket, selectedTicketId }: TicketListProps) => {
  const { tickets, loading, refetch } = useSupportTickets();
  const [filter, setFilter] = useState<'all' | 'open' | 'waiting' | 'resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  const getCompactTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / 60000);
    
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  const getMessagePreview = (ticket: SupportTicket) => {
    if (!ticket.last_message) return 'Sem mensagens';
    
    const prefix = ticket.last_message.sender_type === 'ai' ? '🤖 ' :
                   ticket.last_message.sender_type === 'admin' ? '👨‍💼 ' : '';
    
    return prefix + ticket.last_message.content.substring(0, 50) + (ticket.last_message.content.length > 50 ? '...' : '');
  };

  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    if (filter === 'open') {
      filtered = filtered.filter(t => t.status === 'open');
    } else if (filter === 'waiting') {
      filtered = filtered.filter(t => t.status === 'waiting_admin');
    } else if (filter === 'resolved') {
      filtered = filtered.filter(t => t.status === 'resolved' || t.status === 'closed');
    }

    // Filtro por categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(t => {
        const category = t.tags?.[0] || 'outros';
        return category === categoryFilter;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.customer_email.toLowerCase().includes(query) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(query)) ||
        t.subject.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [tickets, filter, categoryFilter, searchQuery]);

  const counts = {
    all: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    waiting: tickets.filter(t => t.status === 'waiting_admin').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  };

  // Contar tickets por categoria
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tickets.length };
    SUPPORT_CATEGORIES.forEach(cat => {
      counts[cat.id] = tickets.filter(t => (t.tags?.[0] || 'outros') === cat.id).length;
    });
    return counts;
  }, [tickets]);

  return (
    <Card className="h-full flex flex-col">
      <div className="p-4 space-y-3 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Conversas</h3>
            <p className="text-xs text-muted-foreground">{counts.all} tickets</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing || loading}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="waiting" className="text-xs">
              Aguardando <span className="ml-1 font-bold">{counts.waiting}</span>
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs">
              Em aberto <span className="ml-1 font-bold">{counts.open}</span>
            </TabsTrigger>
            <TabsTrigger value="resolved" className="text-xs">
              Finalizadas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filtro por categoria */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Filtrar por Assunto</label>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Todas as categorias ({categoryCounts.all})
              </SelectItem>
              {SUPPORT_CATEGORIES.map((category) => {
                const Icon = category.icon;
                return (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: category.color }} />
                      <span>{category.label}</span>
                      <span className="text-muted-foreground">
                        ({categoryCounts[category.id] || 0})
                      </span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ScrollArea className="flex-1 h-0 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground font-medium">Nenhum ticket encontrado</p>
            </div>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => {
                  console.log('🎯 [TicketList] Ticket clicked:', ticket.id);
                  onSelectTicket(ticket);
                }}
                className={`p-3 cursor-pointer transition-all hover:bg-muted/50 ${
                  selectedTicketId === ticket.id 
                    ? 'bg-blue-50 border-l-4 border-blue-500' 
                    : ''
                }`}
              >
                <div className="flex gap-3">
                  <ChatAvatar
                    name={ticket.customer_name || undefined}
                    email={ticket.customer_email}
                    size="md"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {ticket.customer_name || ticket.customer_email}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {getCompactTime(ticket.last_message_at)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {getMessagePreview(ticket)}
                    </p>
                    
                    <div className="flex items-center gap-1 flex-wrap">
                      {ticket.status === 'waiting_admin' && (
                        <Badge variant="destructive" className="text-xs px-2 py-0">
                          Aguardando
                        </Badge>
                      )}
                      {/* Categoria */}
                      {ticket.tags && ticket.tags.length > 0 && (() => {
                        const categoryId = ticket.tags[0];
                        const category = getCategoryById(categoryId);
                        if (category) {
                          const Icon = category.icon;
                          return (
                            <Badge key="category" variant="outline" className="text-xs px-2 py-0 flex items-center gap-1">
                              <Icon className="h-3 w-3" style={{ color: category.color }} />
                              {category.label}
                            </Badge>
                          );
                        }
                        return null;
                      })()}
                      {ticket.ai_handled && (
                        <Badge variant="outline" className="text-xs px-2 py-0">
                          🤖 IA
                        </Badge>
                      )}
                      {ticket.unread_count && ticket.unread_count > 0 && (
                        <Badge className="text-xs px-2 py-0 bg-blue-500">
                          {ticket.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
