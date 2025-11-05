import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = 'https://n8n-n8n.nuwfic.easypanel.host/webhook/email_auth_lojafy';

interface AuthEventData {
  event_type: string;
  email: string;
  user_id: string;
  timestamp: string;
  status: 'success' | 'error';
  metadata?: Record<string, any>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Auth webhook received request:', req.method);
    
    const body = await req.json();
    console.log('Auth webhook body:', body);

    const { event_type, email, user_id, status, metadata } = body;

    // Validate required fields
    if (!event_type || !email) {
      console.error('Missing required fields: event_type or email');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_type, email' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare data for N8N webhook
    const authEventData: AuthEventData = {
      event_type,
      email,
      user_id: user_id || '',
      timestamp: new Date().toISOString(),
      status: status || 'success',
      metadata: metadata || {}
    };

    console.log('Sending to N8N:', authEventData);

    // Send to N8N webhook
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(authEventData),
    });

    console.log('N8N Response status:', n8nResponse.status);

    // Log N8N errors but don't fail the auth event
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.warn('N8N webhook failed (non-critical):', n8nResponse.status, errorText);
      
      // Return success even if N8N fails - auth event is still valid
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Auth event processed (N8N notification failed)',
          event_type,
          email,
          n8n_status: 'failed',
          n8n_error: n8nResponse.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const n8nResult = await n8nResponse.text();
    console.log('N8N webhook success:', n8nResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Auth event sent to N8N successfully',
        event_type,
        email,
        n8n_status: 'success'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in auth webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error) 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});