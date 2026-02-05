import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
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

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Método não permitido' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate API Key
    const apiKey = req.headers.get('X-API-Key') || req.headers.get('x-api-key');
    if (!apiKey) {
      await logApiRequest(supabase, {
        functionName: 'api-link-acesso-gerar',
        method: 'POST',
        statusCode: 401,
        durationMs: Date.now() - startTime,
        errorMessage: 'API Key não fornecida',
      });
      return new Response(
        JSON.stringify({ success: false, error: 'API Key não fornecida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify API Key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (keyError || !keyData) {
      await logApiRequest(supabase, {
        functionName: 'api-link-acesso-gerar',
        method: 'POST',
        statusCode: 401,
        durationMs: Date.now() - startTime,
        errorMessage: 'API Key inválida ou inativa',
      });
      return new Response(
        JSON.stringify({ success: false, error: 'API Key inválida ou inativa' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check permission usuarios.write
    const permissions = keyData.permissions as Record<string, any> | null;
    const hasPermission = permissions?.usuarios?.write === true;

    if (!hasPermission) {
      await logApiRequest(supabase, {
        functionName: 'api-link-acesso-gerar',
        method: 'POST',
        apiKeyId: keyData.id,
        statusCode: 403,
        durationMs: Date.now() - startTime,
        errorMessage: 'Permissão usuarios.write não concedida',
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Permissão usuarios.write não concedida' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', keyData.id);

    // Parse body
    const body = await req.json();

    if (!body.user_id) {
      await logApiRequest(supabase, {
        functionName: 'api-link-acesso-gerar',
        method: 'POST',
        apiKeyId: keyData.id,
        statusCode: 400,
        durationMs: Date.now() - startTime,
        requestBody: body,
        errorMessage: 'user_id é obrigatório',
      });
      return new Response(
        JSON.stringify({ success: false, error: 'user_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user exists
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .eq('user_id', body.user_id)
      .single();

    if (userError || !userProfile) {
      await logApiRequest(supabase, {
        functionName: 'api-link-acesso-gerar',
        method: 'POST',
        apiKeyId: keyData.id,
        statusCode: 404,
        durationMs: Date.now() - startTime,
        requestBody: body,
        errorMessage: 'Usuário não encontrado',
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate token
    const token = crypto.randomUUID();
    const expiresHours = Math.min(body.expires_hours || 24, 168); // max 7 days
    const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);
    const redirectUrl = body.redirect_url || '/reseller/first-access';

    // Insert token
    const { error: insertError } = await supabase
      .from('one_time_access_tokens')
      .insert({
        user_id: body.user_id,
        token,
        expires_at: expiresAt.toISOString(),
        redirect_url: redirectUrl,
      });

    if (insertError) {
      console.error('Error inserting token:', insertError);
      await logApiRequest(supabase, {
        functionName: 'api-link-acesso-gerar',
        method: 'POST',
        apiKeyId: keyData.id,
        statusCode: 500,
        durationMs: Date.now() - startTime,
        requestBody: body,
        errorMessage: 'Erro ao gerar token: ' + insertError.message,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao gerar token' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build access link
    const baseUrl = 'https://lojafy.lovable.app';
    const accessLink = `${baseUrl}/auth/onetime?token=${token}`;

    const responseData = {
      success: true,
      data: {
        link: accessLink,
        token,
        expires_at: expiresAt.toISOString(),
        expires_hours: expiresHours,
        redirect_url: redirectUrl,
        user: {
          id: userProfile.user_id,
          name: [userProfile.first_name, userProfile.last_name].filter(Boolean).join(' ') || null,
        },
      },
    };

    await logApiRequest(supabase, {
      functionName: 'api-link-acesso-gerar',
      method: 'POST',
      apiKeyId: keyData.id,
      statusCode: 200,
      durationMs: Date.now() - startTime,
      requestBody: body,
      responseSummary: { success: true, user_id: body.user_id },
    });

    console.log(`Access link generated for user ${body.user_id}, expires in ${expiresHours}h`);

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in api-link-acesso-gerar:', error);
    await logApiRequest(supabase, {
      functionName: 'api-link-acesso-gerar',
      method: 'POST',
      statusCode: 500,
      durationMs: Date.now() - startTime,
      errorMessage: error.message,
    });
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
