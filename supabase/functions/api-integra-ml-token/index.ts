import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { logApiRequest } from '../_shared/logApiRequest.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let apiKeyId: string | null = null;
  let userId: string | null = null;

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key não fornecida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, user_id, permissions, active')
      .eq('api_key', apiKey)
      .single();

    if (keyError || !keyData) {
      console.error('API Key validation error:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'API Key inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!keyData.active) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key desativada' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    apiKeyId = keyData.id;
    userId = keyData.user_id;

    const permissions = keyData.permissions as Record<string, { read?: boolean; write?: boolean }> | null;
    if (!permissions?.integracoes?.write) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão insuficiente. Requer: integracoes.write' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    const body = await req.json();
    console.log('Received body:', JSON.stringify(body));

    const tokenData = Array.isArray(body) ? body[0] : body;
    
    const {
      lojafy_user_id,
      access_token,
      token_type = 'Bearer',
      expires_in,
      scope,
      user_id: ml_user_id,
      refresh_token
    } = tokenData;

    if (!lojafy_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo obrigatório: lojafy_user_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!access_token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo obrigatório: access_token' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ml_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campo obrigatório: user_id (ID do Mercado Livre)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    console.log(`Processing ML integration for user ${lojafy_user_id}, ML user ${ml_user_id}`);

    const { data: integration, error: upsertError } = await supabase
      .from('mercadolivre_integrations')
      .upsert({
        user_id: lojafy_user_id,
        access_token,
        token_type,
        refresh_token: refresh_token || null,
        expires_in: expires_in || null,
        expires_at: expiresAt,
        scope: scope || null,
        ml_user_id: ml_user_id,
        is_active: true,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select('id, user_id, ml_user_id, expires_at, is_active')
      .single();

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw new Error(`Erro ao salvar integração: ${upsertError.message}`);
    }

    console.log('Integration saved successfully:', integration);

    const responseData = {
      success: true,
      message: 'Integração Mercado Livre salva com sucesso',
      data: {
        integration_id: integration.id,
        lojafy_user_id: integration.user_id,
        ml_user_id: integration.ml_user_id,
        expires_at: integration.expires_at,
        is_active: integration.is_active
      }
    };

    await logApiRequest({
      function_name: 'api-integra-ml-token',
      method: req.method,
      path: '/api-integra-ml-token',
      api_key_id: apiKeyId,
      user_id: userId,
      status_code: 200,
      duration_ms: Date.now() - startTime,
      request_body: { lojafy_user_id, ml_user_id },
      response_summary: { success: true, integration_id: integration.id }
    });

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing ML token:', error);

    await logApiRequest({
      function_name: 'api-integra-ml-token',
      method: req.method,
      path: '/api-integra-ml-token',
      api_key_id: apiKeyId,
      user_id: userId,
      status_code: 500,
      duration_ms: Date.now() - startTime,
      error_message: error.message
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
