import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('X-API-Key');
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'API key é obrigatória' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar API Key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('user_id')
      .eq('key', apiKey)
      .eq('active', true)
      .single();

    if (keyError || !keyData) {
      console.error('API key inválida:', keyError);
      return new Response(
        JSON.stringify({ success: false, error: 'API key inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const user_id = url.searchParams.get('user_id');
    const email = url.searchParams.get('email');

    if (!user_id && !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'user_id ou email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar usuário
    let query = supabase
      .from('profiles')
      .select('user_id, first_name, last_name, role, created_at');

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (email) {
      // Buscar email na tabela auth.users
      const { data: authData } = await supabase.auth.admin.listUsers();
      const authUser = authData.users.find(u => u.email === email);
      
      if (authUser) {
        query = query.eq('user_id', authUser.id);
      } else {
        return new Response(
          JSON.stringify({ success: true, exists: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar email do usuário
    const { data: authUser } = await supabase.auth.admin.getUserById(data.user_id);

    console.log('Usuário encontrado:', data.user_id);

    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        data: {
          user_id: data.user_id,
          email: authUser?.user?.email || null,
          full_name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
          role: data.role,
          created_at: data.created_at
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro inesperado:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
