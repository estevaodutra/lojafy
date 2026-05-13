import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apenas super_admin pode chamar esta função
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: authError } = await userSupabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verificar se é super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();

  if (profile?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden: super_admin only' }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { withdrawal_id, action, rejection_reason } = await req.json();

    if (!withdrawal_id || !action) {
      return new Response(JSON.stringify({ error: 'withdrawal_id and action are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'action must be "approve" or "reject"' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar solicitação de saque
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_id)
      .single();

    if (fetchError || !withdrawal) {
      return new Response(JSON.stringify({ error: 'Withdrawal request not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!['pending', 'processing'].includes(withdrawal.status)) {
      return new Response(JSON.stringify({ error: `Cannot ${action} a withdrawal with status: ${withdrawal.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      const amount = Number(withdrawal.amount);
      const fee = Number(withdrawal.fee ?? 0);
      const netAmount = amount - fee;

      // Debitar carteira do usuário
      const { data: debitResult, error: debitError } = await supabase.rpc('debitar_carteira', {
        p_user_id: withdrawal.user_id,
        p_valor: amount,
        p_descricao: `Saque aprovado - R$ ${netAmount.toFixed(2)} líquido`,
        p_referencia_tipo: 'saque',
        p_referencia_id: withdrawal_id,
      });

      if (debitError || !debitResult?.success) {
        console.error('[withdrawal] Debit failed:', debitError || debitResult);
        return new Response(
          JSON.stringify({ error: debitResult?.error || debitError?.message || 'Insufficient balance' }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Atualizar status do saque
      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'approved',
          processed_at: now,
          processed_by: user.id,
          net_amount: netAmount,
          updated_at: now,
        })
        .eq('id', withdrawal_id);

      // Notificar usuário
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: '✅ Saque aprovado!',
        message: `Seu saque de R$ ${amount.toFixed(2)} foi aprovado. Você receberá R$ ${netAmount.toFixed(2)} líquido.`,
        type: 'withdrawal_approved',
        action_url: '/reseller/financeiro',
        action_label: 'Ver Extrato',
      });

      // Disparar webhook para n8n processar a transferência (se configurado)
      const n8nUrl = Deno.env.get('N8N_WEBHOOK_SAQUE_URL');
      if (n8nUrl) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, phone')
          .eq('user_id', withdrawal.user_id)
          .single();

        const { data: authUser } = await supabase.auth.admin.getUserById(withdrawal.user_id);

        fetch(n8nUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            withdrawal_id,
            user_id: withdrawal.user_id,
            email: authUser?.user?.email,
            name: [userProfile?.first_name, userProfile?.last_name].filter(Boolean).join(' '),
            amount,
            net_amount: netAmount,
            fee,
            bank_details: withdrawal.bank_details,
            processed_at: now,
          }),
        }).catch((e: Error) => console.error('[withdrawal] n8n notify failed:', e));
      }

      console.log(`✅ Withdrawal ${withdrawal_id} approved by ${user.id}`);
      return new Response(
        JSON.stringify({ success: true, action: 'approved', net_amount: netAmount }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      // Rejeitar
      if (!rejection_reason?.trim()) {
        return new Response(JSON.stringify({ error: 'rejection_reason is required when rejecting' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          rejection_reason: rejection_reason.trim(),
          processed_at: now,
          processed_by: user.id,
          updated_at: now,
        })
        .eq('id', withdrawal_id);

      // Notificar usuário
      await supabase.from('notifications').insert({
        user_id: withdrawal.user_id,
        title: '❌ Saque não aprovado',
        message: `Seu saque de R$ ${Number(withdrawal.amount).toFixed(2)} foi rejeitado. Motivo: ${rejection_reason.trim()}`,
        type: 'withdrawal_rejected',
        action_url: '/reseller/financeiro',
        action_label: 'Ver Detalhes',
      });

      console.log(`❌ Withdrawal ${withdrawal_id} rejected by ${user.id}: ${rejection_reason}`);
      return new Response(
        JSON.stringify({ success: true, action: 'rejected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('[withdrawal] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
