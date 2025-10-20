import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminChatMessages } from '@/hooks/useAdminChatMessages';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useState, useEffect, useRef } from 'react';
import { Send, CheckCircle2, XCircle, StickyNote } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketChatViewProps {
  ticketId: string;
}

export const TicketChatView = ({ ticketId }: TicketChatViewProps) => {
  const { messages, loading, sending, sendMessage, updateTicketStatus } = useAdminChatMessages(ticketId);
  const { tickets } = useSupportTickets();
  const [messageContent, setMessageContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ticket = tickets.find(t => t.id === ticketId);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!messageContent.trim()) return;
    await sendMessage(messageContent, isInternal);
    setMessageContent('');
    setIsInternal(false);
  };

  const getMessageStyle = (senderType: string, isInternal: boolean) => {
    if (isInternal) {
      return 'bg-yellow-100 border-l-4 border-yellow-500';
    }
    if (senderType === 'customer') {
      return 'bg-primary/10 ml-auto';
    }
    if (senderType === 'ai') {
      return 'bg-blue-100';
    }
    return 'bg-green-100';
  };

  const getMessageIcon = (senderType: string, isInternal: boolean) => {
    if (isInternal) return '📝';
    if (senderType === 'customer') return '👤';
    if (senderType === 'ai') return '🤖';
    return '👨‍💼';
  };

  if (loading) {
    return <Card className="p-4">Carregando conversa...</Card>;
  }

  if (!ticket) {
    return <Card className="p-4">Ticket não encontrado</Card>;
  }

  return (
    <Card className="flex flex-col h-[calc(100vh-300px)]">
      {/* Header */}
      <div className="p-4 border-b space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{ticket.subject}</h3>
            <p className="text-sm text-muted-foreground">{ticket.customer_email}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={ticket.status === 'waiting_admin' ? 'destructive' : 'default'}>
              {ticket.status}
            </Badge>
            <Badge>{ticket.priority}</Badge>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-lg max-w-[80%] ${getMessageStyle(message.sender_type, message.is_internal)}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm">
                  {getMessageIcon(message.sender_type, message.is_internal)}
                </span>
                <span className="text-xs font-medium">
                  {message.is_internal ? 'Nota Interna' : 
                   message.sender_type === 'customer' ? 'Cliente' :
                   message.sender_type === 'ai' ? 'IA' : 'Admin'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t space-y-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded"
            />
            <StickyNote className="h-4 w-4" />
            Nota Interna (não visível ao cliente)
          </label>
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Digite sua mensagem..."
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1"
            rows={3}
          />
          <Button
            onClick={handleSend}
            disabled={sending || !messageContent.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateTicketStatus('resolved')}
            disabled={ticket.status === 'resolved'}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Resolver
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => updateTicketStatus('closed')}
            disabled={ticket.status === 'closed'}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Fechar
          </Button>
        </div>
      </div>
    </Card>
  );
};
