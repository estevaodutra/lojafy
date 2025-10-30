import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { ticketId, reason } = await req.json();

    console.log('Notifying admins about ticket:', ticketId, 'reason:', reason);

    // Buscar informações do ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*, profiles:user_id(first_name, last_name)')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket not found:', ticketError);
      return new Response(JSON.stringify({ error: 'Ticket not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar todos os super admins
    const { data: admins, error: adminsError } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('role', 'super_admin')
      .eq('is_active', true);

    if (adminsError || !admins || admins.length === 0) {
      console.error('No admins found:', adminsError);
      return new Response(JSON.stringify({ error: 'No admins to notify' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const customerName = ticket.profiles 
      ? `${ticket.profiles.first_name || ''} ${ticket.profiles.last_name || ''}`.trim() || 'Cliente'
      : 'Cliente';

    const notificationTitle = reason === 'escalation' 
      ? '🚨 Ticket Escalado para Atendimento Humano'
      : '⚠️ Novo Ticket Aguardando Atendimento';

    const notificationMessage = reason === 'escalation'
      ? `${customerName} solicitou atendimento humano. Categoria: ${ticket.category || 'Geral'}`
      : `Ticket #${ticket.id.slice(0, 8)} de ${customerName} está aguardando resposta.`;

    // Criar notificações para todos os admins
    const notifications = admins.map(admin => ({
      user_id: admin.user_id,
      title: notificationTitle,
      message: notificationMessage,
      type: 'system',
      action_url: `/super-admin/chat-support?ticket=${ticketId}`,
      action_label: 'Ver Ticket',
      metadata: {
        ticket_id: ticketId,
        priority: ticket.priority,
        category: ticket.category,
        reason: reason
      }
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Error creating notifications:', notifError);
      throw notifError;
    }

    console.log(`Successfully notified ${admins.length} admins about ticket ${ticketId}`);

    return new Response(JSON.stringify({ 
      success: true, 
      notified: admins.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in notify-admin-ticket:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
