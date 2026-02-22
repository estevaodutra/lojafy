import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WEBHOOK_URL = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/lojafy_reset_password';
const REDIRECT_URL = 'https://lojafy.lovable.app/reset-password';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    if (!body.email) {
      return new Response(JSON.stringify({ error: 'Email é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Generate recovery link via Admin API
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: body.email,
      options: {
        redirectTo: REDIRECT_URL,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error('[reset-password-proxy] Generate link error:', linkError?.message || 'No action_link');
      // Return generic message to avoid revealing if email exists
      return new Response(JSON.stringify({ message: 'Se o email existir, você receberá um link de redefinição.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const resetLink = linkData.properties.action_link;
    console.log('[reset-password-proxy] Recovery link generated for:', body.email);

    // 2. Send email + reset_link to n8n webhook for delivery
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const webhookRes = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: body.email,
          reset_link: resetLink,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!webhookRes.ok) {
        const webhookError = await webhookRes.text();
        console.error('[reset-password-proxy] Webhook delivery failed:', webhookRes.status, webhookError);
      } else {
        console.log('[reset-password-proxy] Webhook delivery successful');
      }
    } catch (webhookErr) {
      console.error('[reset-password-proxy] Webhook error (non-critical):', webhookErr);
    }

    // 3. Return success
    return new Response(JSON.stringify({ message: 'Link de redefinição enviado com sucesso!' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[reset-password-proxy] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
