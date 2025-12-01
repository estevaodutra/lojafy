import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

const VALID_ROLES = ['customer', 'reseller', 'supplier', 'admin', 'super_admin'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    
    if (!apiKey) {
      console.error('API key missing');
      return new Response(
        JSON.stringify({ success: false, error: 'API key é obrigatória' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const { data: apiKeyData, error: apiKeyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('api_key', apiKey)
      .eq('active', true)
      .single();

    if (apiKeyError || !apiKeyData) {
      console.error('Invalid API key');
      return new Response(
        JSON.stringify({ success: false, error: 'API key inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    console.log('API key validated successfully');

    // Parse request body
    const body = await req.json();
    const { user_id, new_role, transitioned_by } = body;

    // Validate required fields
    if (!user_id || !new_role) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id e new_role são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(new_role)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Role inválida. Valores permitidos: ${VALID_ROLES.join(', ')}` 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Attempting to change role for user ${user_id} to ${new_role}`);

    // Get current user data
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', user_id)
      .single();

    if (userError || !userData) {
      console.error('User not found:', userError);
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previous_role = userData.role;

    // Check if role is already the same
    if (previous_role === new_role) {
      console.log('Role is already set to', new_role);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Role já está configurada como ' + new_role,
          data: { user_id, previous_role, new_role, no_change: true }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user email from auth.users
    const { data: authUser } = await supabase.auth.admin.getUserById(user_id);
    const userEmail = authUser?.user?.email || 'unknown';

    // Update role in profiles table
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({ role: new_role, updated_at: new Date().toISOString() })
      .eq('user_id', user_id);

    if (updateProfileError) {
      console.error('Error updating profile:', updateProfileError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao atualizar role no perfil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Profile role updated successfully');

    // Update or insert in user_roles table
    const { error: upsertRoleError } = await supabase
      .from('user_roles')
      .upsert({ 
        user_id, 
        role: new_role 
      }, { 
        onConflict: 'user_id,role' 
      });

    if (upsertRoleError) {
      console.error('Error updating user_roles:', upsertRoleError);
    }

    // Log the transition
    const transitionedAt = new Date().toISOString();
    const { error: logError } = await supabase
      .from('role_transition_logs')
      .insert({
        user_id,
        from_role: previous_role,
        to_role: new_role,
        transitioned_by: transitioned_by || null,
        transitioned_at: transitionedAt
      });

    if (logError) {
      console.error('Error logging transition:', logError);
    }

    console.log('Role transition logged');

    // Trigger webhook for customer -> reseller transition
    let webhookTriggered = false;
    if (previous_role === 'customer' && new_role === 'reseller') {
      try {
        const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
        if (webhookUrl) {
          const webhookResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user_id,
              email: userEmail,
              fromRole: previous_role,
              toRole: new_role,
              transitionedBy: transitioned_by,
              transitionedAt
            })
          });

          if (webhookResponse.ok) {
            webhookTriggered = true;
            console.log('Webhook triggered successfully');
            
            // Update log with webhook status
            await supabase
              .from('role_transition_logs')
              .update({ 
                webhook_triggered: true,
                webhook_response: await webhookResponse.text()
              })
              .eq('user_id', user_id)
              .eq('from_role', previous_role)
              .eq('to_role', new_role)
              .eq('transitioned_at', transitionedAt);
          } else {
            console.error('Webhook failed:', webhookResponse.status);
          }
        }
      } catch (webhookError) {
        console.error('Error triggering webhook:', webhookError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Role atualizada com sucesso',
        data: {
          user_id,
          email: userEmail,
          previous_role,
          new_role,
          transitioned_at: transitionedAt,
          transitioned_by: transitioned_by || null,
          webhook_triggered: webhookTriggered
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in api-usuarios-alterar-role:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
