import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getCategoryByKeywords } from '@/constants/supportCategories';

export interface SupportTicket {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string;
  subject: string;
  status: 'open' | 'waiting_customer' | 'waiting_admin' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  last_message_at: string;
  ai_handled: boolean;
  metadata: any;
  tags?: string[];
  unread_count?: number;
  last_message?: {
    content: string;
    sender_type: string;
    created_at: string;
  };
}

export const useSupportTickets = () => {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    if (!user) return;

    try {
      console.log('🔄 [useSupportTickets] Fetching tickets...');
      
      const { data: ticketsData, error, count } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact' })
        .order('last_message_at', { ascending: false });

      console.log('📊 [useSupportTickets] Result:');
      console.log('  - Count:', count);
      console.log('  - Data length:', ticketsData?.length);
      console.log('  - Error:', error);

      if (error) {
        console.error('❌ [useSupportTickets] Error:', error);
        throw error;
      }
      
      // Buscar última mensagem para cada ticket
      const ticketsWithMessages = await Promise.all(
        (ticketsData || []).map(async (ticket) => {
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('content, sender_type, created_at')
            .eq('ticket_id', ticket.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          return {
            ...ticket,
            last_message: lastMsg || undefined,
          };
        })
      );
      
      if (ticketsWithMessages && ticketsWithMessages.length > 0) {
        console.log('  - First ticket:', ticketsWithMessages[0].id, ticketsWithMessages[0].customer_email);
        console.log('  - Last ticket:', ticketsWithMessages[ticketsWithMessages.length - 1].id, ticketsWithMessages[ticketsWithMessages.length - 1].customer_email);
      }
      
      setTickets(ticketsWithMessages || []);
      console.log('✅ [useSupportTickets] Tickets loaded successfully');
    } catch (error) {
      console.error('💥 [useSupportTickets] Error fetching tickets:', error);
      toast.error('Erro ao carregar tickets de suporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Realtime subscription for ticket updates
    const channel = supabase
      .channel('support-tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets'
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const createTicket = async (subject: string) => {
    if (!user || !profile) {
      toast.error('Você precisa estar logado');
      return null;
    }

    try {
      // Detectar categoria automaticamente baseado no subject
      const category = getCategoryByKeywords(subject);

      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          customer_name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null,
          customer_email: user.email!,
          subject,
          status: 'open',
          priority: 'normal',
          tags: [category.id]
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Ticket de suporte criado');
      fetchTickets();
      return data;
    } catch (error) {
      console.error('Erro ao criar ticket:', error);
      toast.error('Erro ao criar ticket de suporte');
      return null;
    }
  };

  const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;

      toast.success('Status do ticket atualizado');
      fetchTickets();
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do ticket');
    }
  };

  const findTicketByEmail = (email: string) => {
    return tickets.find(t => t.customer_email.toLowerCase() === email.toLowerCase());
  };

  return {
    tickets,
    loading,
    createTicket,
    updateTicketStatus,
    refetch: fetchTickets,
    findTicketByEmail
  };
};
