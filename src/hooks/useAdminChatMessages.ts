import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ChatMessage {
  id: string;
  ticket_id: string;
  sender_id: string | null;
  sender_type: 'customer' | 'ai' | 'admin' | 'system';
  content: string;
  is_internal: boolean;
  metadata: any;
  created_at: string;
}

export const useAdminChatMessages = (ticketId: string | null) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();

  const fetchMessages = async () => {
    if (!ticketId) {
      console.log('⚠️ [useAdminChatMessages] No ticketId provided');
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('🎯 [useAdminChatMessages] Fetching messages for ticket:', ticketId);
      
      // Log current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      console.log('👤 [useAdminChatMessages] Current user:', currentUser?.id, currentUser?.email);
      
      // Check user role (fix: use user_id instead of id)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', currentUser?.id)
        .single();
      
      console.log('🔐 [useAdminChatMessages] User role:', profile?.role);
      if (profileError) console.warn('⚠️ [useAdminChatMessages] Profile error:', profileError);
      
      const { data, error, count } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact' })
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      console.log('📊 [useAdminChatMessages] Query result:');
      console.log('  - Count:', count);
      console.log('  - Data length:', data?.length);
      console.log('  - Error:', error);

      if (error) {
        console.error('❌ [useAdminChatMessages] Query error:', error);
        if (error.message.includes('RLS') || error.message.includes('policy')) {
          toast.error('Erro de permissão: você não tem acesso a estas mensagens');
        }
        throw error;
      }

      if (data && data.length > 0) {
        console.log('📝 [useAdminChatMessages] First message:', data[0].sender_type, data[0].content.substring(0, 50));
        console.log('📝 [useAdminChatMessages] Last message:', data[data.length - 1].sender_type, data[data.length - 1].content.substring(0, 50));
      }

      setMessages(data || []);
      console.log('✅ [useAdminChatMessages] Messages loaded successfully:', data?.length || 0);
    } catch (error) {
      console.error('💥 [useAdminChatMessages] Error fetching messages:', error);
      toast.error('Erro ao carregar mensagens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    const channel = supabase
      .channel(`chat-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          setMessages(prev => [...prev, payload.new as ChatMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const sendMessage = async (content: string, isInternal: boolean = false) => {
    if (!ticketId || !user) return;

    try {
      setSending(true);
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          ticket_id: ticketId,
          sender_id: user.id,
          sender_type: 'admin',
          content,
          is_internal: isInternal,
        });

      if (error) throw error;

      await supabase
        .from('support_tickets')
        .update({
          status: isInternal ? undefined : 'waiting_customer',
          last_message_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      toast.success(isInternal ? 'Nota interna adicionada' : 'Mensagem enviada');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const updateTicketStatus = async (status: string) => {
    if (!ticketId) return;

    try {
      const updates: any = { status, last_message_at: new Date().toISOString() };
      
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;
      toast.success('Status atualizado');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    updateTicketStatus,
    refetchMessages: fetchMessages,
  };
};
