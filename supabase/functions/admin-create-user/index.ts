import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  name: string;
  email: string;
  phone: string;
  cpf?: string | null;
  role: 'customer' | 'reseller' | 'supplier';
  plan: 'free' | 'premium';
  expiration_period: 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'lifetime';
  features: string[];
  send_post_sale: boolean;
}

const generatePassword = () => {
  const year = new Date().getFullYear();
  const random = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `LojaFy${year}@${random}`;
};

const calculateExpirationDate = (period: string): Date | null => {
  const now = new Date();
  switch (period) {
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() + 3));
    case 'semiannual':
      return new Date(now.setMonth(now.getMonth() + 6));
    case 'annual':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case 'lifetime':
      return null;
    default:
      return null;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Client para validar o usuário requisitante
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Client admin com SERVICE_ROLE_KEY
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Validar JWT do requisitante
    const { data: { user: requester }, error: authError } = await userClient.auth.getUser();
    if (authError || !requester) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ success: false, error: 'Não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é super_admin
    const { data: requesterProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('user_id', requester.id)
      .single();

    if (requesterProfile?.role !== 'super_admin') {
      console.log('Access denied for user:', requester.id, 'role:', requesterProfile?.role);
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado. Apenas super admins podem criar usuários.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: CreateUserRequest = await req.json();
    console.log('Creating user:', body.email, 'by admin:', requester.id);

    // Validar campos obrigatórios
    if (!body.name || !body.email || !body.phone || !body.role || !body.plan || !body.expiration_period) {
      return new Response(
        JSON.stringify({ success: false, error: 'Campos obrigatórios faltando' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Gerar senha temporária
    const tempPassword = generatePassword();
    const names = body.name.trim().split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    // 1. Criar usuário no Auth
    const { data: authData, error: createError } = await adminClient.auth.admin.createUser({
      email: body.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });

    if (createError) {
      console.error('Create user error:', createError);
      if (createError.message?.includes('already')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Este email já está cadastrado' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ success: false, error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const newUserId = authData.user.id;
    console.log('User created in auth:', newUserId);

    // 2. Calcular data de expiração
    const expirationDate = calculateExpirationDate(body.expiration_period);

    // 3. Atualizar profile
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: body.phone,
        cpf: body.cpf || null,
        role: body.role,
        subscription_plan: body.plan,
        subscription_expires_at: expirationDate?.toISOString() || null,
      })
      .eq('user_id', newUserId);

    if (profileError) {
      console.error('Profile update error:', profileError);
    }

    // 4. Atribuir features selecionadas
    if (body.features && body.features.length > 0) {
      const featureInserts = body.features.map(featureId => ({
        user_id: newUserId,
        feature_id: featureId,
        status: 'ativo' as const,
        tipo_periodo: body.expiration_period === 'lifetime' ? 'vitalicio' as const : 'mensal' as const,
        data_inicio: new Date().toISOString(),
        data_expiracao: expirationDate?.toISOString() || null,
        atribuido_por: requester.id,
        motivo: 'Atribuição na criação do usuário',
      }));

      const { error: featuresError } = await adminClient
        .from('user_features')
        .insert(featureInserts);

      if (featuresError) {
        console.error('Features insert error:', featuresError);
      }
    }

    // 5. Gerar link de acesso único
    let accessLink = null;
    try {
      const { data: linkData, error: linkError } = await adminClient
        .from('onetime_access_links')
        .insert({
          user_id: newUserId,
          token: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
        })
        .select('token')
        .single();

      if (!linkError && linkData) {
        accessLink = `https://lojafy.lovable.app/auth/one-time?token=${linkData.token}`;
      }
    } catch (e) {
      console.error('Error generating access link:', e);
    }

    // 6. Disparar webhook pós-venda (se habilitado)
    if (body.send_post_sale) {
      try {
        const selectedPlan = body.plan === 'free' ? 'Free' : 'Premium';
        await fetch('https://n8n-n8n.nuwfic.easypanel.host/webhook/FN_onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: newUserId,
            nome: body.name,
            cpf: body.cpf || null,
            email: body.email,
            telefone: body.phone,
            role: body.role,
            plano_id: body.plan,
            plano_nome: selectedPlan,
            periodo_expiracao: body.expiration_period,
            expiracao: expirationDate?.toISOString() || null,
            features: body.features,
            access_link: accessLink,
            created_at: new Date().toISOString(),
          }),
        });
        console.log('Post-sale webhook sent successfully');
      } catch (webhookError) {
        console.error('Webhook error:', webhookError);
      }
    }

    console.log('User creation completed:', newUserId);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUserId,
        access_link: accessLink,
        message: body.send_post_sale ? 'Usuário criado e pós-venda enviado' : 'Usuário criado com sucesso',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
