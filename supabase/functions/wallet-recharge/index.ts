import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { valor } = await req.json();

    if (!valor || typeof valor !== 'number' || valor <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Valor inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch wallet settings
    const { data: settings } = await supabase
      .from('platform_settings')
      .select('carteira_valor_minimo, carteira_valor_maximo, carteira_taxa_percentual')
      .single();

    const minimo = Number(settings?.carteira_valor_minimo) || 100;
    const maximo = Number(settings?.carteira_valor_maximo) || 5000;
    const taxaPct = Number(settings?.carteira_taxa_percentual) || 5.5;

    if (valor < minimo) {
      return new Response(
        JSON.stringify({ success: false, error: `Valor mínimo de recarga é R$ ${minimo.toFixed(2)}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (valor > maximo) {
      return new Response(
        JSON.stringify({ success: false, error: `Valor máximo de recarga é R$ ${maximo.toFixed(2)}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taxa = Math.round(valor * (taxaPct / 100) * 100) / 100;
    const totalPagar = valor + taxa;

    // Ensure wallet exists
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, saldo')
      .eq('user_id', user.id)
      .maybeSingle();

    let walletId = wallet?.id;
    const saldoAtual = wallet?.saldo ?? 0;

    if (!walletId) {
      const { data: newWallet, error: walletError } = await supabase
        .from('wallets')
        .insert({ user_id: user.id })
        .select('id')
        .single();
      if (walletError) throw walletError;
      walletId = newWallet.id;
    }

    // Create pending transaction
    const { data: transaction, error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: walletId,
        tipo: 'recarga',
        valor: valor,
        taxa: taxa,
        valor_pago: totalPagar,
        saldo_anterior: saldoAtual,
        saldo_posterior: saldoAtual, // Will be updated when payment is confirmed
        descricao: 'Recarga via PIX',
        referencia_tipo: 'recarga_pix',
        status: 'pending',
      })
      .select('id')
      .single();

    if (txError) throw txError;

    // Get user profile for PIX
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, last_name, cpf')
      .eq('user_id', user.id)
      .single();

    // Call create-pix-payment with wallet reference
    const { data: pixResponse, error: pixError } = await supabase.functions.invoke('create-pix-payment', {
      body: {
        amount: totalPagar,
        description: `Recarga Carteira - R$ ${valor.toFixed(2)}`,
        payer: {
          email: user.email,
          firstName: profile?.first_name || 'Cliente',
          lastName: profile?.last_name || '',
          cpf: profile?.cpf || '',
        },
        orderItems: [{
          productId: 'wallet-recharge',
          productName: `Recarga Carteira R$ ${valor.toFixed(2)}`,
          quantity: 1,
          unitPrice: totalPagar,
        }],
        external_reference: `wallet_${transaction.id}`,
      },
    });

    if (pixError) {
      // Rollback: delete pending transaction
      await supabase.from('wallet_transactions').delete().eq('id', transaction.id);
      throw pixError;
    }

    // Update transaction with payment_id
    if (pixResponse?.payment_id) {
      await supabase
        .from('wallet_transactions')
        .update({ payment_id: pixResponse.payment_id })
        .eq('id', transaction.id);
    }

    console.log(`Wallet recharge created: tx=${transaction.id}, valor=${valor}, taxa=${taxa}, total=${totalPagar}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        valor_saldo: valor,
        taxa: taxa,
        total_pagar: totalPagar,
        qr_code: pixResponse?.qr_code || '',
        qr_code_base64: pixResponse?.qr_code_base64 || '',
        payment_id: pixResponse?.payment_id || '',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Wallet recharge error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
