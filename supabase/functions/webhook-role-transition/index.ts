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

    const { userId, fromRole, toRole, transitionedBy } = await req.json();

    console.log('Processing role transition:', { userId, fromRole, toRole });

    // Buscar dados completos do usuário
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      throw userError;
    }

    // Buscar email do auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError) {
      console.error('Error fetching auth data:', authError);
    }

    // Registrar a transição
    const { data: transitionLog, error: logError } = await supabase
      .from('role_transition_logs')
      .insert({
        user_id: userId,
        from_role: fromRole,
        to_role: toRole,
        transitioned_by: transitionedBy
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating transition log:', logError);
      throw logError;
    }

    console.log('Transition log created:', transitionLog.id);

    // Se for transição de customer para reseller, enviar webhook
    if (fromRole === 'customer' && toRole === 'reseller') {
      const webhookUrl = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/transition_client_to_reseller';
      
      const webhookPayload = {
        event: 'customer_to_reseller_transition',
        timestamp: new Date().toISOString(),
        user: {
          id: userId,
          email: authData?.user?.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          cpf: userData.cpf,
          business_name: userData.business_name,
          business_cnpj: userData.business_cnpj,
          created_at: userData.created_at
        },
        transition: {
          from_role: fromRole,
          to_role: toRole,
          transitioned_at: new Date().toISOString(),
          transitioned_by: transitionedBy
        }
      };

      console.log('Sending webhook to n8n:', webhookUrl);
      
      try {
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        });

        const webhookSuccess = webhookResponse.ok;
        console.log('Webhook response:', webhookResponse.status, webhookSuccess ? 'success' : 'failed');

        // Atualizar log com status do webhook
        await supabase
          .from('role_transition_logs')
          .update({
            webhook_sent: webhookSuccess,
            webhook_sent_at: new Date().toISOString()
          })
          .eq('id', transitionLog.id);

      } catch (webhookError) {
        console.error('Error sending webhook:', webhookError);
        // Continuar mesmo se o webhook falhar
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      transition_id: transitionLog.id,
      message: 'Role transition processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in webhook-role-transition:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
