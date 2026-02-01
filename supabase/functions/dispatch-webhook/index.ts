import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

async function generateHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const payloadData = encoder.encode(payload);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, payloadData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { event_type, payload, is_test = false } = body;

    if (!event_type) {
      return new Response(
        JSON.stringify({ success: false, error: 'event_type é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[dispatch-webhook] Disparando evento: ${event_type}, is_test: ${is_test}`);

    // Buscar configuração do webhook
    const { data: webhookConfig, error: configError } = await supabase
      .from('webhook_settings')
      .select('*')
      .eq('event_type', event_type)
      .single();

    if (configError || !webhookConfig) {
      console.error(`[dispatch-webhook] Configuração não encontrada para: ${event_type}`);
      return new Response(
        JSON.stringify({ success: false, error: 'Configuração de webhook não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se está ativo
    if (!webhookConfig.active && !is_test) {
      console.log(`[dispatch-webhook] Webhook ${event_type} está inativo, ignorando`);
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook desativado' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se tem URL configurada
    if (!webhookConfig.webhook_url) {
      console.log(`[dispatch-webhook] Webhook ${event_type} sem URL configurada`);
      return new Response(
        JSON.stringify({ success: false, error: 'URL do webhook não configurada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Montar payload final
    const webhookPayload: WebhookPayload = {
      event: event_type,
      timestamp: new Date().toISOString(),
      data: payload || {},
    };

    if (is_test) {
      webhookPayload.data._test = true;
      webhookPayload.data._test_message = 'Este é um evento de teste';
    }

    const payloadString = JSON.stringify(webhookPayload);

    // Gerar assinatura HMAC
    let signature = '';
    if (webhookConfig.secret_token) {
      signature = await generateHmacSignature(webhookConfig.secret_token, payloadString);
    }

    console.log(`[dispatch-webhook] Enviando para: ${webhookConfig.webhook_url}`);

    // Enviar webhook com timeout de 10 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    let statusCode = 0;
    let responseBody = '';
    let errorMessage = '';

    try {
      const response = await fetch(webhookConfig.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event_type,
          'X-Webhook-Timestamp': webhookPayload.timestamp,
        },
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      statusCode = response.status;
      responseBody = await response.text().catch(() => '');
      
      console.log(`[dispatch-webhook] Resposta: ${statusCode}`);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        errorMessage = 'Timeout: webhook não respondeu em 10 segundos';
        statusCode = 408;
      } else {
        errorMessage = fetchError.message || 'Erro ao conectar com webhook';
        statusCode = 0;
      }
      console.error(`[dispatch-webhook] Erro no fetch:`, errorMessage);
    }

    // Atualizar status no webhook_settings
    await supabase
      .from('webhook_settings')
      .update({
        last_triggered_at: new Date().toISOString(),
        last_status_code: statusCode,
        last_error_message: errorMessage || null,
      })
      .eq('event_type', event_type);

    // Registrar no log
    await supabase
      .from('webhook_dispatch_logs')
      .insert({
        event_type,
        payload: webhookPayload,
        status_code: statusCode,
        response_body: responseBody.substring(0, 1000), // Limitar tamanho
        error_message: errorMessage || null,
      });

    const success = statusCode >= 200 && statusCode < 300;

    return new Response(
      JSON.stringify({
        success,
        event_type,
        status_code: statusCode,
        error: errorMessage || undefined,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[dispatch-webhook] Erro inesperado:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
