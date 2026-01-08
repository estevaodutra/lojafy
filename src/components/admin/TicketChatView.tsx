import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useAdminChatMessages } from '@/hooks/useAdminChatMessages';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useStandardAnswers, StandardAnswer } from '@/hooks/useStandardAnswers';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Send, CheckCircle2, XCircle, StickyNote, MessageSquare, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import { ChatMessage } from '@/components/admin/ChatMessage';
import { ChatAvatar } from '@/components/admin/ChatAvatar';
import { MessageDateSeparator } from '@/components/admin/MessageDateSeparator';
import { QuickRepliesPanel } from '@/components/admin/QuickRepliesPanel';
import { CorrectAIResponseModal } from '@/components/admin/CorrectAIResponseModal';
import { BusinessHoursIndicator } from '@/components/admin/BusinessHoursIndicator';
import { isWithinBusinessHours } from '@/lib/businessHours';
import { isSameDay, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TicketChatViewProps {
  ticketId: string;
}

export const TicketChatView = ({ ticketId }: TicketChatViewProps) => {
  const { messages, loading, sending, sendMessage, updateTicketStatus, refetchMessages } = useAdminChatMessages(ticketId);
  const { tickets } = useSupportTickets();
  const { standardAnswers, incrementUsage } = useStandardAnswers();
  const [messageContent, setMessageContent] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedAIMessage, setSelectedAIMessage] = useState<any>(null);
  const [customerQuestion, setCustomerQuestion] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const businessHours = isWithinBusinessHours();

  const ticket = tickets.find(t => t.id === ticketId);
  const activeRepliesCount = standardAnswers.filter(a => a.active).length;

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!messageContent.trim()) return;

    if (!isInternal && !businessHours.isOpen) {
      const confirm = window.confirm(
        `${businessHours.message}\n\nDeseja enviar mensagem mesmo assim?`
      );
      if (!confirm) return;
    }

    await sendMessage(messageContent, isInternal);
    setMessageContent('');
    setIsInternal(false);
  };

  const handleSelectQuickReply = (answer: StandardAnswer) => {
    setMessageContent(answer.answer);
    setShowQuickReplies(false);
    incrementUsage(answer.id);
    toast.success(`Resposta "${answer.name}" inserida`);
  };

  const handleCorrectAIResponse = (message: any) => {
    const messageIndex = messages.findIndex(m => m.id === message.id);
    const prevMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;
    
    setSelectedAIMessage(message);
    setCustomerQuestion(prevMessage?.content || 'Pergunta não encontrada');
    setCorrectionModalOpen(true);
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
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-full">
      {/* Header */}
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
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <BusinessHoursIndicator />
            {!businessHours.isOpen && (
              <Badge variant="outline" className="text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Fora do horário
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={refetchMessages}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => updateTicketStatus('resolved')}
              disabled={ticket.status === 'resolved'}
              size="sm"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Resolver
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-muted/30">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center p-6">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma mensagem</p>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex}>
                <MessageDateSeparator date={group.date} />
                {group.messages.map((message, idx) => (
                  <ChatMessage 
                    key={message.id} 
                    message={message}
                    customerName={ticket.customer_name}
                    customerEmail={ticket.customer_email}
                    onCorrectAIResponse={handleCorrectAIResponse}
                    previousMessage={idx > 0 ? group.messages[idx - 1] : null}
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
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded"
            />
            <StickyNote className="h-4 w-4" />
            Nota Interna
          </label>
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder={isInternal ? "Nota interna..." : "Digite sua mensagem..."}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className={cn("flex-1", isInternal && "border-yellow-400 bg-yellow-50")}
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <Sheet open={showQuickReplies} onOpenChange={setShowQuickReplies}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" title="Respostas rápidas">
                  <Zap className="h-4 w-4" />
                  {activeRepliesCount > 0 && (
                    <Badge variant="secondary" className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                      {activeRepliesCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0">
                <QuickRepliesPanel onSelectReply={handleSelectQuickReply} />
              </SheetContent>
            </Sheet>
            <Button onClick={handleSend} disabled={sending || !messageContent.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

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

      {/* Correction Modal */}
      {selectedAIMessage && (
        <CorrectAIResponseModal
          open={correctionModalOpen}
          onOpenChange={(open) => {
            setCorrectionModalOpen(open);
            if (!open) {
              setSelectedAIMessage(null);
              refetchMessages();
            }
          }}
          message={selectedAIMessage}
          customerQuestion={customerQuestion}
          ticketId={ticketId}
        />
      )}
    </Card>
  );
};
