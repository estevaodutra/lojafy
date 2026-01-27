import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { OrderTicketMessage, TicketAuthorType } from '@/types/orderTickets';

export const useOrderTicketMessages = (ticketId: string | null) => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch messages for a ticket
  const { data: messages, isLoading, error, refetch } = useQuery({
    queryKey: ['order-ticket-messages', ticketId],
    queryFn: async () => {
      if (!ticketId) return [];

      // First get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('order_ticket_messages')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      // Get author profiles for non-system messages
      const authorIds = [...new Set(messagesData.map(m => m.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, avatar_url')
        .in('user_id', authorIds);

      // Merge author data
      const messagesWithAuthors = messagesData.map(msg => ({
        ...msg,
        author: profiles?.find(p => p.user_id === msg.author_id) || null,
      }));

      return messagesWithAuthors as OrderTicketMessage[];
    },
    enabled: !!ticketId,
  });

  // Real-time subscription for new messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_ticket_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['order-ticket-messages', ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);

  // Determine author type based on user role
  const getAuthorType = (): TicketAuthorType => {
    if (!profile) return 'cliente';
    
    switch (profile.role) {
      case 'super_admin':
      case 'admin':
        return 'superadmin';
      case 'supplier':
        return 'fornecedor';
      case 'reseller':
        return 'revendedor';
      default:
        return 'cliente';
    }
  };

  // Send a new message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, isInternal = false }: { message: string; isInternal?: boolean }) => {
      if (!user || !ticketId) throw new Error('Missing required data');

      const authorType = getAuthorType();

      const { data, error } = await supabase
        .from('order_ticket_messages')
        .insert({
          ticket_id: ticketId,
          author_id: user.id,
          author_type: authorType,
          message,
          is_internal: isInternal,
        })
        .select()
        .single();

      if (error) throw error;

      // Update ticket status if customer responded to "aguardando_cliente"
      if (authorType === 'cliente') {
        const { data: ticket } = await supabase
          .from('order_tickets')
          .select('status')
          .eq('id', ticketId)
          .single();

        if (ticket?.status === 'aguardando_cliente') {
          await supabase
            .from('order_tickets')
            .update({ status: 'em_analise' })
            .eq('id', ticketId);
        }
      }

      // Update ticket updated_at
      await supabase
        .from('order_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order-ticket-messages', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['order-tickets'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    messages: messages || [],
    isLoading,
    error,
    refetch,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    getAuthorType,
  };
};
