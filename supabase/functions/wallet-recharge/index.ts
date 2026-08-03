import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { logApiRequest, getClientIp } from '../_shared/logApiRequest.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function handleRequest(req: Request): Promise<Response> {
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
        saldo_posterior: saldoAtual,
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
      .select('first_name, last_name, cpf, phone')
      .eq('user_id', user.id)
      .single();

    // Build N8N payload (same format as create-pix-payment)
    const n8nPayload = {
      pedido: {
        external_reference: `wallet_${transaction.id}`,
        timestamp: new Date().toISOString(),
        valor_total: totalPagar,
        descricao: `Recarga Carteira - R$ ${valor.toFixed(2)}`,
        quantidade_itens: 1,
      },
      cliente: {
        user_id: user.id,
        nome_completo: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
        email: user.email,
        telefone: profile?.phone || '',
        cpf: (profile?.cpf || '').replace(/\D/g, ''),
        endereco: null,
      },
      produtos: [{
        id: 'wallet-recharge',
        nome: `Recarga Carteira R$ ${valor.toFixed(2)}`,
        preco_unitario: totalPagar,
        quantidade: 1,
        valor_total_item: totalPagar,
      }],
      pagamento: {
        metodo: 'pix',
        valor: totalPagar,
      },
      metadata: {
        platform: 'lojafy'
      },
    };

    const n8nBaseUrl = Deno.env.get('N8N_WEBHOOK_BASE_URL') || 'https://n8n-n8n.nuwfic.easypanel.host';
    const primaryWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL') || `${n8nBaseUrl}/webhook/gerar_pix`;
    const testWebhookUrl = Deno.env.get('N8N_WEBHOOK_TEST_URL') || `${n8nBaseUrl}/webhook-test/gerar_pix`;

    let n8nResult: any;

    // Attempt 1: Production webhook
    try {
      console.log('Wallet recharge: tentando webhook de produção...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(primaryWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(n8nPayload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log('N8N Response Status (Primary):', response.status);

      try {
        n8nResult = JSON.parse(responseText);
      } catch {
        throw new Error('N8N retornou resposta inválida');
      }

      if (response.ok) {
        console.log('Webhook de produção respondeu com sucesso');
      } else if (response.status === 404 && (n8nResult.message?.includes('not registered') || n8nResult.code === 404)) {
        throw new Error('WEBHOOK_NOT_REGISTERED');
      } else {
        throw new Error(`N8N webhook failed with status ${response.status}`);
      }
    } catch (error) {
      console.log('Erro no webhook primário:', error instanceof Error ? error.message : String(error));

      if (error instanceof Error && error.message === 'WEBHOOK_NOT_REGISTERED') {
        // Attempt 2: Test webhook
        try {
          console.log('Wallet recharge: tentando webhook de teste...');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          const response = await fetch(testWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(n8nPayload),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          const responseText = await response.text();
          console.log('N8N Response Status (Test):', response.status);

          try {
            n8nResult = JSON.parse(responseText);
          } catch {
            throw new Error('N8N retornou resposta inválida');
          }

          if (!response.ok) {
            throw new Error(`N8N test webhook failed with status ${response.status}`);
          }
          console.log('Webhook de teste respondeu com sucesso');
        } catch (testError) {
          // Rollback transaction
          await supabase.from('wallet_transactions').delete().eq('id', transaction.id);
          throw testError;
        }
      } else if (error instanceof Error && error.name === 'AbortError') {
        await supabase.from('wallet_transactions').delete().eq('id', transaction.id);
        throw new Error('PIX_SERVICE_TIMEOUT');
      } else {
        await supabase.from('wallet_transactions').delete().eq('id', transaction.id);
        throw error;
      }
    }

    // Parse N8N response (same format as create-pix-payment)
    let pixData: any;
    if (Array.isArray(n8nResult) && n8nResult.length > 0) {
      pixData = n8nResult[0];
    } else if (n8nResult && typeof n8nResult === 'object') {
      pixData = n8nResult;
    } else {
      await supabase.from('wallet_transactions').delete().eq('id', transaction.id);
      throw new Error('Formato de resposta PIX inválido');
    }

    if (!pixData.qrCodeBase64 || !pixData.qrCodeCopyPaste) {
      await supabase.from('wallet_transactions').delete().eq('id', transaction.id);
      throw new Error('Dados do QR Code PIX não disponíveis');
    }

    // Update transaction with payment_id
    const paymentId = pixData.paymentId || `wallet_${transaction.id}`;
    await supabase
      .from('wallet_transactions')
      .update({ payment_id: paymentId })
      .eq('id', transaction.id);

    console.log(`Wallet recharge created: tx=${transaction.id}, valor=${valor}, taxa=${taxa}, total=${totalPagar}`);

    return new Response(
      JSON.stringify({
        success: true,
        transaction_id: transaction.id,
        valor_saldo: valor,
        taxa: taxa,
        total_pagar: totalPagar,
        qr_code: pixData.qrCodeCopyPaste,
        qr_code_base64: pixData.qrCodeBase64,
        payment_id: paymentId,
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
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const startTime = Date.now();
  const ipAddress = getClientIp(req);
  let userId: string | undefined = undefined;
  let requestBody: any = null;

  try {
    const clone = req.clone();
    requestBody = await clone.json();
  } catch (_) {}

  // Initialize Supabase inside the wrapper to query user
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }
  } catch (_) {}

  let response: Response;
  try {
    response = await handleRequest(req);
  } catch (error) {
    console.error('Wallet recharge handler uncaught error:', error);
    response = new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log to database
  try {
    const duration = Date.now() - startTime;
    const responseClone = response.clone();
    const responseText = await responseClone.text();
    let responseSummary: any = null;
    let errorMessage: string | undefined = undefined;
    
    try {
      responseSummary = JSON.parse(responseText);
      if (response.status >= 400 && responseSummary?.error) {
        errorMessage = responseSummary.error;
      }
    } catch (_) {
      responseSummary = { text: responseText.substring(0, 200) };
      if (response.status >= 400) {
        errorMessage = responseText.substring(0, 200);
      }
    }

    await logApiRequest({
      function_name: 'wallet-recharge',
      method: req.method,
      path: '/functions/v1/wallet-recharge',
      user_id: userId,
      ip_address: ipAddress,
      request_body: requestBody,
      status_code: response.status,
      response_summary: responseSummary,
      error_message: errorMessage,
      duration_ms: duration,
    });
  } catch (logError) {
    console.error('Wallet recharge failed to write API log:', logError);
  }

  return response;
});
