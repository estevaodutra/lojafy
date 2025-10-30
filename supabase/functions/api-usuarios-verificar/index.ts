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
      .eq('api_key', apiKey)
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
    const email = url.searchParams.get('email');
    const normalizedEmail = email?.trim();

    if (!normalizedEmail) {
      console.log('Email vazio ou não fornecido, retornando exists: false');
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar todos os usuários e filtrar por email
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error('Erro ao buscar usuários:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Erro ao buscar usuários' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filtrar usuário por email (case-insensitive)
    const authUser = authData.users.find(u => u.email?.toLowerCase() === normalizedEmail.toLowerCase());

    if (!authUser) {
      console.log('Usuário não encontrado:', normalizedEmail);
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar perfil do usuário
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, role, created_at')
      .eq('user_id', authUser.id)
      .single();

    if (profileError || !profileData) {
      console.log('Perfil não encontrado para:', authUser.id);
      return new Response(
        JSON.stringify({ success: true, exists: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Usuário encontrado:', profileData.user_id);

    return new Response(
      JSON.stringify({
        success: true,
        exists: true,
        data: {
          user_id: profileData.user_id,
          email: authUser.email,
          full_name: `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim(),
          role: profileData.role,
          created_at: profileData.created_at
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
