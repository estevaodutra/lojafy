import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bot, Clock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useChatMessages } from '@/hooks/useChatMessages';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { tickets, createTicket } = useSupportTickets();
  const { messages, sending, sendMessage } = useChatMessages(currentTicketId);

  // Usar ticket aberto existente ou criar novo
  useEffect(() => {
    if (isOpen && !currentTicketId) {
      const openTicket = tickets.find(t => t.status !== 'closed' && t.status !== 'resolved');
      
      if (openTicket) {
        setCurrentTicketId(openTicket.id);
      } else {
        // Criar novo ticket
        createTicket('Atendimento via Chat').then((ticket) => {
          if (ticket) setCurrentTicketId(ticket.id);
        });
      }
    }
  }, [isOpen, tickets, currentTicketId, createTicket]);

  // Auto scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageToSend = message;
    setMessage('');
    await sendMessage(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const currentTicket = tickets.find(t => t.id === currentTicketId);

  return (
    <Card className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Suporte ao Cliente</h3>
            <p className="text-xs opacity-90">Resposta instantânea com IA</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Status do Ticket */}
      {currentTicket && (
        <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Status:</span>
          </div>
          <Badge variant={
            currentTicket.status === 'waiting_admin' ? 'default' : 
            currentTicket.status === 'resolved' ? 'secondary' : 'outline'
          }>
            {currentTicket.status === 'open' && 'Aberto'}
            {currentTicket.status === 'waiting_customer' && 'Aguardando sua resposta'}
            {currentTicket.status === 'waiting_admin' && 'Aguardando atendente'}
            {currentTicket.status === 'resolved' && 'Resolvido'}
            {currentTicket.status === 'closed' && 'Fechado'}
          </Badge>
        </div>
      )}

      {/* Mensagens */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Olá! Como posso ajudar você hoje?</p>
            <p className="text-xs mt-2">Nossa IA responde instantaneamente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender_type === 'customer' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  msg.sender_type === 'customer' 
                    ? 'bg-primary text-primary-foreground' 
                    : msg.sender_type === 'ai'
                    ? 'bg-blue-500 text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {msg.sender_type === 'customer' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`flex-1 ${msg.sender_type === 'customer' ? 'text-right' : ''}`}>
                  <div className={`inline-block px-4 py-2 rounded-lg max-w-[85%] ${
                    msg.sender_type === 'customer'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted px-4 py-2 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Pressione Enter para enviar
        </p>
      </div>
    </Card>
  );
}
