import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validCpf(value: string) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  for (let length = 9; length <= 10; length++) {
    const sum = [...value.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    if (((sum * 10) % 11) % 10 !== Number(value[length])) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Não autorizado' }, 401);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: 'Serviço não configurado' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Não autenticado' }, 401);

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile, error: profileError } = await adminClient.from('profiles').select('role').eq('user_id', user.id).single();
    if (profileError || profile?.role !== 'super_admin') return json({ error: 'Acesso restrito ao Super Admin' }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return json({ error: 'Corpo inválido' }, 400);
    const { request_id, partner_id, name, email, phone, cpf } = body as Record<string, unknown>;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof request_id !== 'string' || !uuid.test(request_id) || typeof partner_id !== 'string' || !uuid.test(partner_id) ||
        typeof name !== 'string' || name.trim().split(/\s+/).length < 2 ||
        typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof phone !== 'string' || !/^\+55\d{10,11}$/.test(phone) ||
        typeof cpf !== 'string' || !validCpf(cpf)) {
      return json({ error: 'Dados pessoais incompletos ou inválidos' }, 400);
    }

    const { data: config, error: configError } = await adminClient
      .from('onboarding_journey_config').select('qualify_trigger_url').eq('id', 1).single();
    if (configError || !config?.qualify_trigger_url) return json({ error: 'URL da Qualify não configurada' }, 500);

    const target = new URL(config.qualify_trigger_url);
    if (target.protocol !== 'https:' || target.hostname !== 'qualify-supabase.d2x.site') {
      return json({ error: 'A URL da Qualify configurada não é permitida' }, 400);
    }

    const qualifyToken = Deno.env.get('QUALIFY_API_TOKEN');
    let response: Response;
    try {
      response = await fetch(target, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(qualifyToken ? { Authorization: `Bearer ${qualifyToken}` } : {}),
        },
        body: JSON.stringify({ request_id, partner_id, name: name.trim(), email: email.trim(), phone, cpf }),
        signal: AbortSignal.timeout(30000),
      });
    } catch (error) {
      return json({ error: error instanceof Error && error.name === 'TimeoutError' ? 'A Qualify demorou para responder' : 'Não foi possível conectar à Qualify' }, 502);
    }

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const message = result && typeof result.message === 'string' ? result.message :
        result && typeof result.error === 'string' ? result.error : 'A Qualify não conseguiu criar o grupo';
      return json({ error: message, status: response.status }, 502);
    }
    if (response.status === 202 || result?.status === 'pending') {
      return json({ status: 'pending', request_id });
    }

    const group = result?.group;
    if (!group || typeof group.id !== 'string' || !group.id || typeof group.title !== 'string' || !group.title ||
        typeof group.invite_url !== 'string') {
      return json({ error: 'A Qualify respondeu sem os dados obrigatórios do grupo' }, 502);
    }
    let inviteUrl: URL;
    try { inviteUrl = new URL(group.invite_url); } catch { return json({ error: 'A Qualify retornou um convite inválido' }, 502); }
    if (inviteUrl.protocol !== 'https:') return json({ error: 'A Qualify retornou um convite inválido' }, 502);
    let validPhoto = true;
    if (group.photo_url) {
      try { validPhoto = typeof group.photo_url === 'string' && new URL(group.photo_url).protocol === 'https:'; }
      catch { validPhoto = false; }
    }
    if (!validPhoto) {
      return json({ error: 'A Qualify retornou uma foto inválida' }, 502);
    }

    return json({
      status: 'ready',
      request_id,
      group: {
        id: group.id,
        title: group.title,
        description: typeof group.description === 'string' ? group.description : '',
        photo_url: group.photo_url || '',
        invite_url: inviteUrl.toString(),
      },
    });
  } catch (error) {
    console.error('Erro no teste de onboarding:', error instanceof Error ? error.message : error);
    return json({ error: 'Erro ao processar o teste de onboarding' }, 500);
  }
});
