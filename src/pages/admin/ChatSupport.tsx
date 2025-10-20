import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { SupportMetrics } from '@/components/admin/SupportMetrics';
import { TicketList } from '@/components/admin/TicketList';
import { TicketChatView } from '@/components/admin/TicketChatView';
import { MessageSquare } from 'lucide-react';
import { SupportTicket } from '@/hooks/useSupportTickets';

const ChatSupport = () => {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chat de Suporte</h1>
        <p className="text-muted-foreground">
          Visualize e gerencie todas as conversas de suporte em tempo real
        </p>
      </div>

      <SupportMetrics />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[600px]">
        <div className="lg:col-span-2">
          <TicketList 
            onSelectTicket={setSelectedTicket}
            selectedTicketId={selectedTicket?.id}
          />
        </div>

        <div className="lg:col-span-3">
          {selectedTicket ? (
            <TicketChatView ticketId={selectedTicket.id} />
          ) : (
            <Card className="h-full flex items-center justify-center">
              <div className="text-center p-6">
                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum ticket selecionado</h3>
                <p className="text-muted-foreground">
                  Selecione um ticket na lista ao lado para visualizar a conversa
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatSupport;
