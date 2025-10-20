import { Card } from '@/components/ui/card';
import { MessageSquare, CheckCircle2, Clock, Bot } from 'lucide-react';
import { useSupportTickets } from '@/hooks/useSupportTickets';

export const SupportMetrics = () => {
  const { tickets } = useSupportTickets();

  const openTickets = tickets.filter(t => 
    t.status !== 'closed' && t.status !== 'resolved'
  ).length;

  const resolvedToday = tickets.filter(t => 
    t.status === 'resolved' && 
    t.resolved_at &&
    new Date(t.resolved_at).toDateString() === new Date().toDateString()
  ).length;

  const aiHandled = tickets.filter(t => t.ai_handled).length;
  const aiResolutionRate = tickets.length > 0 
    ? Math.round((aiHandled / tickets.length) * 100) 
    : 0;

  const waitingAdmin = tickets.filter(t => t.status === 'waiting_admin').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tickets Abertos</p>
            <p className="text-2xl font-bold">{openTickets}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <Clock className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Aguardando</p>
            <p className="text-2xl font-bold">{waitingAdmin}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Resolvidos Hoje</p>
            <p className="text-2xl font-bold">{resolvedToday}</p>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <Bot className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Taxa IA</p>
            <p className="text-2xl font-bold">{aiResolutionRate}%</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
