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
    const { user_id, subscription_expires_at } = body;

    // Validate required parameters
    if (!user_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'user_id é obrigatório',
          nota: 'Este endpoint atualiza profiles.subscription_expires_at que controla a expiração de todas as features e matrículas do usuário'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar perfil atual
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_expires_at, first_name, last_name')
      .eq('user_id', user_id)
      .single();

    if (profileError || !currentProfile) {
      return new Response(
        JSON.stringify({ success: false, error: 'Usuário não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualizar validade do perfil (e consequentemente de todas features/matrículas)
    const { data, error } = await supabase
      .from('profiles')
      .update({ subscription_expires_at: subscription_expires_at || null })
      .eq('user_id', user_id)
      .select('subscription_expires_at')
      .single();

    if (error) {
      console.error('Erro ao atualizar validade:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sincronizar a expiração com todas as matrículas do usuário
    const { error: syncError } = await supabase
      .from('course_enrollments')
      .update({ expires_at: subscription_expires_at || null })
      .eq('user_id', user_id);

    if (syncError) {
      console.warn('Aviso: Erro ao sincronizar matrículas:', syncError);
    }

    // Sincronizar a expiração com todas as features do usuário (exceto vitalicio/cortesia)
    const { error: featuresSyncError } = await supabase
      .from('user_features')
      .update({ data_expiracao: subscription_expires_at || null })
      .eq('user_id', user_id)
      .not('tipo_periodo', 'in', '("vitalicio","cortesia")');

    if (featuresSyncError) {
      console.warn('Aviso: Erro ao sincronizar features:', featuresSyncError);
    }

    // Calculate days remaining
    let dias_restantes: number | null = null;
    if (data.subscription_expires_at) {
      const expirationDate = new Date(data.subscription_expires_at);
      const now = new Date();
      dias_restantes = Math.max(0, Math.ceil((expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    console.log('Validade do perfil atualizada com sucesso:', user_id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Validade da assinatura atualizada com sucesso',
        data: {
          user_id,
          old_expires_at: currentProfile.subscription_expires_at,
          new_expires_at: data.subscription_expires_at,
          dias_restantes,
          updated_at: new Date().toISOString()
        },
        sincronizacao: {
          matriculas: !syncError ? 'sincronizado' : 'falhou',
          features: !featuresSyncError ? 'sincronizado' : 'falhou',
          nota: 'Features vitalício/cortesia não são afetadas'
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
