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

    const body = await req.json();
    const { 
      email, 
      full_name, 
      password, 
      role = 'customer',
      subscription_plan,
      subscription_days,
      subscription_expires_at,
      phone
    } = body;

    // Validações
    if (!email || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'email e password são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se email já existe
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const emailExists = existingUsers.users.some(u => u.email === email);

    if (emailExists) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email já está em uso' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar usuário no auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name || ''
      }
    });

    if (authError || !authData.user) {
      console.error('Erro ao criar usuário:', authError);
      return new Response(
        JSON.stringify({ success: false, error: authError?.message || 'Erro ao criar usuário' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calcular data de expiração
    let calculatedExpiresAt: string | null = null;
    let daysGranted: number | null = null;

    if (subscription_days && subscription_days > 0) {
      // Calcular a partir de quantidade de dias
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + subscription_days);
      calculatedExpiresAt = expirationDate.toISOString();
      daysGranted = subscription_days;
    } else if (subscription_expires_at) {
      // Usar data fixa informada
      calculatedExpiresAt = subscription_expires_at;
      // Calcular dias restantes para referência
      const now = new Date();
      const expiresDate = new Date(subscription_expires_at);
      daysGranted = Math.ceil((expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Atualizar perfil
    const names = (full_name || '').split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        role: role,
        phone: phone || null,
        subscription_plan: subscription_plan || 'free',
        subscription_expires_at: calculatedExpiresAt
      })
      .eq('user_id', authData.user.id);

    if (profileError) {
      console.error('Erro ao atualizar perfil:', profileError);
    }

    // Gerar link de acesso único
    const accessToken = crypto.randomUUID();
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

    let accessLink: string | null = null;
    let accessLinkExpiresAt: string | null = null;

    const { error: tokenError } = await supabase
      .from('one_time_access_tokens')
      .insert({
        user_id: authData.user.id,
        token: accessToken,
        expires_at: tokenExpiresAt.toISOString(),
        created_by: keyData.user_id,
        redirect_url: '/reseller/first-access'
      });

    if (tokenError) {
      console.error('Erro ao gerar token de acesso:', tokenError);
    } else {
      accessLink = `https://lojafy.lovable.app/auth/onetime?token=${accessToken}`;
      accessLinkExpiresAt = tokenExpiresAt.toISOString();
    }

    console.log('Usuário criado com sucesso:', authData.user.id, 'Expiração:', calculatedExpiresAt, 'Access Link:', accessLink ? 'gerado' : 'falhou');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário criado com sucesso',
        data: {
          user_id: authData.user.id,
          email: authData.user.email,
          full_name: full_name,
          role: role,
          subscription_plan: subscription_plan || 'free',
          subscription_expires_at: calculatedExpiresAt,
          subscription_days_granted: daysGranted,
          created_at: authData.user.created_at,
          access_link: accessLink,
          access_link_expires_at: accessLinkExpiresAt
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
