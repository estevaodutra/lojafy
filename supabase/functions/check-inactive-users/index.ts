import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InactiveUser {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  last_sign_in_at: string | null;
  created_at: string;
  days_inactive: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('[check-inactive-users] Iniciando verificação de usuários inativos');

    // Verificar quais webhooks de inatividade estão ativos
    const { data: activeWebhooks, error: webhooksError } = await supabase
      .from('webhook_settings')
      .select('event_type, active, webhook_url')
      .in('event_type', ['user.inactive.7days', 'user.inactive.15days', 'user.inactive.30days'])
      .eq('active', true);

    if (webhooksError) {
      console.error('[check-inactive-users] Erro ao buscar webhooks:', webhooksError);
      throw webhooksError;
    }

    if (!activeWebhooks || activeWebhooks.length === 0) {
      console.log('[check-inactive-users] Nenhum webhook de inatividade ativo');
      return new Response(
        JSON.stringify({ success: true, message: 'Nenhum webhook de inatividade ativo' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const activeEventTypes = activeWebhooks.map(w => w.event_type);
    console.log('[check-inactive-users] Webhooks ativos:', activeEventTypes);

    const results = {
      checked: 0,
      dispatched: 0,
      errors: 0,
      details: [] as any[],
    };

    // Processar cada tipo de inatividade
    for (const eventType of activeEventTypes) {
      let daysThreshold = 0;
      
      if (eventType === 'user.inactive.7days') daysThreshold = 7;
      else if (eventType === 'user.inactive.15days') daysThreshold = 15;
      else if (eventType === 'user.inactive.30days') daysThreshold = 30;
      else continue;

      console.log(`[check-inactive-users] Buscando usuários inativos há ${daysThreshold} dias`);

      // Buscar usuários inativos
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
      const thresholdDateStr = thresholdDate.toISOString();

      // Query para usuários inativos que ainda não receberam este webhook
      const { data: inactiveUsers, error: usersError } = await supabase
        .rpc('get_users_with_email')
        .not('last_sign_in_at', 'is', null)
        .lt('last_sign_in_at', thresholdDateStr);

      if (usersError) {
        console.error(`[check-inactive-users] Erro ao buscar usuários:`, usersError);
        results.errors++;
        continue;
      }

      if (!inactiveUsers || inactiveUsers.length === 0) {
        console.log(`[check-inactive-users] Nenhum usuário inativo há ${daysThreshold} dias`);
        continue;
      }

      results.checked += inactiveUsers.length;

      // Para cada usuário inativo, verificar se já foi notificado
      for (const user of inactiveUsers) {
        // Verificar se já foi disparado para este usuário/evento
        const { data: existingDispatch } = await supabase
          .from('webhook_inactivity_dispatched')
          .select('id')
          .eq('user_id', user.user_id)
          .eq('event_type', eventType)
          .maybeSingle();

        if (existingDispatch) {
          console.log(`[check-inactive-users] Webhook já disparado para ${user.email} (${eventType})`);
          continue;
        }

        // Calcular dias de inatividade
        const lastSignIn = new Date(user.last_sign_in_at);
        const now = new Date();
        const daysInactive = Math.floor((now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24));

        // Verificar se está no range correto (evitar disparar 30 dias para quem já passou)
        if (eventType === 'user.inactive.7days' && (daysInactive < 7 || daysInactive >= 15)) continue;
        if (eventType === 'user.inactive.15days' && (daysInactive < 15 || daysInactive >= 30)) continue;
        if (eventType === 'user.inactive.30days' && daysInactive < 30) continue;

        console.log(`[check-inactive-users] Disparando ${eventType} para ${user.email} (${daysInactive} dias inativo)`);

        // Montar payload
        const payload = {
          user_id: user.user_id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
          role: user.role,
          last_sign_in_at: user.last_sign_in_at,
          days_inactive: daysInactive,
          created_at: user.created_at,
        };

        // Disparar webhook
        try {
          const dispatchResponse = await supabase.functions.invoke('dispatch-webhook', {
            body: {
              event_type: eventType,
              payload,
            },
          });

          if (dispatchResponse.error) {
            console.error(`[check-inactive-users] Erro ao disparar webhook:`, dispatchResponse.error);
            results.errors++;
          } else {
            // Registrar que foi disparado
            await supabase
              .from('webhook_inactivity_dispatched')
              .insert({
                user_id: user.user_id,
                event_type: eventType,
              });

            results.dispatched++;
            results.details.push({
              event_type: eventType,
              user_email: user.email,
              days_inactive: daysInactive,
            });
          }
        } catch (dispatchError) {
          console.error(`[check-inactive-users] Erro ao invocar dispatch-webhook:`, dispatchError);
          results.errors++;
        }
      }
    }

    console.log('[check-inactive-users] Resultado:', results);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-inactive-users] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
