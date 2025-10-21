import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAdminChatMessages } from '@/hooks/useAdminChatMessages';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Send, CheckCircle2, XCircle, StickyNote, MessageSquare, RefreshCw } from 'lucide-react';
import { ChatMessage } from '@/components/admin/ChatMessage';
import { ChatAvatar } from '@/components/admin/ChatAvatar';
import { MessageDateSeparator } from '@/components/admin/MessageDateSeparator';
import { isSameDay, parseISO } from 'date-fns';

interface TicketChatViewProps {
  ticketId: string;
}

export const TicketChatView = ({ ticketId }: TicketChatViewProps) => {
  const { messages, loading, sending, sendMessage, updateTicketStatus, refetchMessages } = useAdminChatMessages(ticketId);
  const { tickets } = useSupportTickets();
  const [messageContent, setMessageContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  console.log('🎨 [TicketChatView] Rendering with ticketId:', ticketId);
  console.log('📋 [TicketChatView] Messages:', messages);
  console.log('⏳ [TicketChatView] Loading:', loading);

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

  const handleForceReload = async () => {
    console.log('🔄 [Force Reload] Recarregando mensagens para ticket:', ticketId);
    await refetchMessages();
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando mensagens...</p>
        </div>
      </Card>
    );
  }

  if (!ticket) {
    return (
      <Card className="h-full flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground text-lg">Ticket não encontrado</p>
          <p className="text-sm text-muted-foreground mt-2">ID: {ticketId}</p>
        </div>
      </Card>
    );
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: Date; messages: typeof messages }[] = [];
    let currentDate: Date | null = null;
    let currentGroup: typeof messages = [];

    messages.forEach((message) => {
      const messageDate = parseISO(message.created_at);
      
      if (!currentDate || !isSameDay(currentDate, messageDate)) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate!, messages: currentGroup });
        }
        currentDate = messageDate;
        currentGroup = [message];
      } else {
        currentGroup.push(message);
      }
    });

    if (currentGroup.length > 0 && currentDate) {
      groups.push({ date: currentDate, messages: currentGroup });
    }

    return groups;
  }, [messages]);

  return (
    <Card className="flex flex-col h-[calc(100vh-300px)]">
      {/* Header - Estilo profissional */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ChatAvatar
              name={ticket.customer_name}
              email={ticket.customer_email}
              size="lg"
              showOnline={false}
            />
            <div>
              <h3 className="font-semibold text-lg">
                {ticket.customer_name || ticket.customer_email}
              </h3>
              <p className="text-sm text-muted-foreground">{ticket.customer_email}</p>
              <div className="flex gap-2 mt-1">
                <Badge variant="outline" className="text-xs">#{ticket.id.slice(0, 8)}</Badge>
                {ticket.tags && ticket.tags.length > 0 && ticket.tags.map((tag, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleForceReload}
              title="Recarregar mensagens"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Badge variant={ticket.status === 'waiting_admin' ? 'destructive' : 'default'}>
              {ticket.status}
            </Badge>
            <Badge variant="outline">{ticket.priority}</Badge>
            <Button
              onClick={() => updateTicketStatus('resolved')}
              disabled={ticket.status === 'resolved'}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Finalizar
            </Button>
          </div>
        </div>
      </div>

      {/* Messages - WhatsApp Style com separadores */}
      <ScrollArea className="flex-1 p-4 bg-muted/30">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg font-medium mb-2">
                Nenhuma mensagem neste ticket
              </p>
              <p className="text-sm text-muted-foreground">
                Inicie a conversa enviando uma mensagem
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                <MessageDateSeparator date={group.date} />
                {group.messages.map((message) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message}
                    customerName={ticket.customer_name}
                    customerEmail={ticket.customer_email}
                  />
                ))}
              </div>
            ))}
            <div ref={scrollRef} />
          </div>
        )}
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
