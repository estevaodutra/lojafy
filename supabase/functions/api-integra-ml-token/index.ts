import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { logApiRequest } from '../_shared/logApiRequest.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let apiKeyId: string | null = null;
  let userId: string | null = null;

  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API Key
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API Key não fornecida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check API Key in database
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

    // Check permission for integrations
    const permissions = keyData.permissions as Record<string, { read?: boolean; write?: boolean }> | null;
    if (!permissions?.integracoes?.write) {
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão insuficiente. Requer: integracoes.write' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    // Parse request body
    const body = await req.json();
    console.log('Received body:', JSON.stringify(body));

    // Extract data - can be array (from n8n) or object
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

    // Validate required fields
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

    // Calculate expires_at
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000).toISOString()
      : null;

    console.log(`Processing ML integration for user ${lojafy_user_id}, ML user ${ml_user_id}`);

    // Upsert integration data
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

    // Log the request
    await logApiRequest(supabase, {
      functionName: 'api-integra-ml-token',
      method: req.method,
      path: '/api-integra-ml-token',
      apiKeyId,
      userId,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestBody: { lojafy_user_id, ml_user_id },
      responseSummary: { success: true, integration_id: integration.id }
    });

    return new Response(
      JSON.stringify(responseData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing ML token:', error);

    await logApiRequest(supabase, {
      functionName: 'api-integra-ml-token',
      method: req.method,
      path: '/api-integra-ml-token',
      apiKeyId,
      userId,
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage: error.message
    });

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
