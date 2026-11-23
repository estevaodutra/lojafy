import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { normalizeQualifyResponse } from '../onboarding-test-qualify/qualifyResponse.ts';
import { calculateOnboardingMlPrice } from '../_shared/onboardingPrice.ts';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const digits = (value: unknown) => typeof value === 'string' ? value.replace(/\D/g, '') : '';
const nationalPhone = (value: string) => value.length > 11 && value.startsWith('55') ? value.slice(2) : value;
const cpfValid = (cpf: string) => {
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let size = 9; size <= 10; size++) {
    const sum = [...cpf.slice(0, size)].reduce((total, digit, index) => total + Number(digit) * (size + 1 - index), 0);
    if (((sum * 10) % 11) % 10 !== Number(cpf[size])) return false;
  }
  return true;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'POST') return reply({ error: 'Método não permitido' }, 405);
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return reply({ error: 'Não autorizado' }, 401);
  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return reply({ error: 'Serviço não configurado' }, 500);

  try {
    const auth = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await auth.auth.getUser();
    if (authError || !user) return reply({ error: 'Sessão inválida' }, 401);
    const db = createClient(url, serviceKey);
    const { data: profile, error: profileError } = await db.from('profiles')
      .select('role, first_name, last_name, phone, cpf').eq('user_id', user.id).single();
    if (profileError || profile?.role !== 'reseller') return reply({ error: 'Acesso restrito ao parceiro' }, 403);
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : 'state';
    if (!['state', 'personal', 'group', 'join', 'advance', 'catalog', 'import_one', 'store_products', 'price_one'].includes(action)) return reply({ error: 'Ação inválida' }, 400);

    const { data: config, error: configError } = await db.from('onboarding_journey_config')
      .select('steps, qualify_trigger_url, enabled, audience, activated_at').eq('id', 1).single();
    if (configError || !Array.isArray(config?.steps)) return reply({ error: 'Roteiro indisponível' }, 503);
    if (!config.enabled) return action === 'state' ? reply({ available: false }) : reply({ error: 'Onboarding inativo' }, 403);
    const load = async () => db.from('partner_onboarding_journey').select('*').eq('user_id', user.id).single();
    const initial = await load();
    if (initial.error || !initial.data) return action === 'state' ? reply({ available: false }) : reply({ error: 'Onboarding indisponível para este parceiro' }, 403);
    let journey = initial.data;
    const started = journey.step_index > 0 || journey.group_status !== 'idle';
    const newPartner = !!config.activated_at && new Date(journey.created_at).getTime() >= new Date(config.activated_at).getTime();
    if (config.audience === 'new' && !started && !newPartner) {
      return action === 'state' ? reply({ available: false }) : reply({ error: 'Onboarding disponível somente para novos parceiros' }, 403);
    }
    const steps = journey.steps as Array<{ id: string }>;
    const current = steps[journey.step_index]?.id;
    const state = () => reply({ available: true, journey, profile: { name: [profile.first_name, profile.last_name].filter(Boolean).join(' '), email: user.email ?? '', phone: profile.phone ?? '', cpf: profile.cpf ?? '' } });
    if (action === 'state' || journey.completed_at) return state();

    const top10 = async () => {
      const { data: feature, error: featureError } = await db.from('features').select('id').eq('slug', 'top_10_produtos').maybeSingle();
      if (featureError || !feature) throw new Error('Top 10 não configurado');
      const { data: rows, error: rowsError } = await db.from('feature_produtos')
        .select('produto_id, ordem').eq('feature_id', feature.id).eq('ativo', true).order('ordem', { ascending: true }).limit(10);
      if (rowsError || !rows?.length) throw new Error('Nenhum produto Top 10 está disponível');
      const ids = rows.map(row => row.produto_id);
      const { data: products, error: productsError } = await db.from('products')
        .select('id, name, sku, price, main_image_url, image_url, active').in('id', ids).eq('active', true);
      if (productsError || !products) throw new Error('Não foi possível carregar os produtos Top 10');
      const map = new Map(products.map(product => [product.id, product]));
      return ids.map(id => map.get(id)).filter((product): product is NonNullable<typeof product> => !!product);
    };

    if (action === 'catalog' || action === 'import_one') {
      if (current !== 'import-top10') return reply({ error: 'Etapa de importação indisponível' }, 409);
      const products = await top10();
      if (action === 'catalog') {
        const { data: imported, error } = await db.from('reseller_products').select('product_id').eq('reseller_id', user.id).eq('active', true)
          .in('product_id', products.map(product => product.id));
        if (error) return reply({ error: 'Não foi possível verificar os produtos da loja' }, 500);
        const importedIds = new Set((imported ?? []).map(item => item.product_id));
        return reply({ products: products.map(product => ({ ...product, imported: importedIds.has(product.id) })) });
      }
      const productId = typeof body.product_id === 'string' ? body.product_id : '';
      if (!products.some(product => product.id === productId)) return reply({ error: 'Produto não pertence ao Top 10 ativo' }, 400);
      const { count, error: countError } = await db.from('reseller_products').select('id', { count: 'exact', head: true }).eq('reseller_id', user.id);
      if (countError) return reply({ error: 'Não foi possível verificar a loja' }, 500);
      const { error: insertError } = await db.from('reseller_products').upsert({ reseller_id: user.id, product_id: productId, active: true, position: (count ?? 0) + 1 },
        { onConflict: 'reseller_id,product_id', ignoreDuplicates: true });
      if (insertError) return reply({ error: 'Não foi possível importar o produto' }, 500);
      const { error: activateError } = await db.from('reseller_products').update({ active: true })
        .eq('reseller_id', user.id).eq('product_id', productId);
      if (activateError) return reply({ error: 'Não foi possível ativar o produto na loja' }, 500);
      return reply({ imported: true, product_id: productId });
    }

    if (action === 'store_products' || action === 'price_one') {
      if (current !== 'publish-ml') return reply({ error: 'Etapa de publicação indisponível' }, 409);
      const { data: storeRows, error: storeError } = await db.from('reseller_products')
        .select('product_id, custom_price').eq('reseller_id', user.id).eq('active', true).order('position', { ascending: true });
      if (storeError || !storeRows?.length) return reply({ error: 'Sua loja não possui produtos para publicar' }, 409);
      const ids = storeRows.map(row => row.product_id);
      if (action === 'price_one') {
        const productId = typeof body.product_id === 'string' ? body.product_id : '';
        if (!ids.includes(productId)) return reply({ error: 'Produto não pertence à sua loja' }, 400);
        const { data: product, error: productError } = await db.from('products').select('price').eq('id', productId).single();
        const basePrice = Number(product?.price);
        if (productError || !Number.isFinite(basePrice) || basePrice <= 0) return reply({ error: 'Produto sem preço base válido' }, 409);
        const price = calculateOnboardingMlPrice(basePrice);
        const { error: priceError } = await db.from('reseller_products').update({ custom_price: price })
          .eq('reseller_id', user.id).eq('product_id', productId).eq('active', true);
        if (priceError) return reply({ error: 'Não foi possível definir a margem do produto' }, 500);
        return reply({ product_id: productId, price, margin: 30 });
      }
      const { data: products, error: productError } = await db.from('products')
        .select('id, name, sku, price, main_image_url, image_url').in('id', ids);
      const { data: published, error: publishedError } = await db.from('mercadolivre_published_products')
        .select('product_id, status, permalink').eq('user_id', user.id).in('product_id', ids);
      if (productError || publishedError) return reply({ error: 'Não foi possível carregar os produtos para publicação' }, 500);
      const productMap = new Map((products ?? []).map(product => [product.id, product]));
      const publishedMap = new Map((published ?? []).map(item => [item.product_id, item]));
      return reply({ products: storeRows.map(row => ({ ...productMap.get(row.product_id), id: row.product_id,
        custom_price: row.custom_price, published: publishedMap.get(row.product_id)?.status === 'published',
        permalink: publishedMap.get(row.product_id)?.permalink ?? null })) });
    }

    if (action === 'personal') {
      if (current !== 'personal-data') return reply({ error: 'Esta etapa já foi concluída' }, 409);
      const savedName = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
      const name = savedName.split(/\s+/).length >= 2 ? savedName : typeof body.name === 'string' ? body.name.trim() : savedName;
      const savedPhone = nationalPhone(digits(profile.phone));
      const phone = /^\d{10,11}$/.test(savedPhone) ? savedPhone : nationalPhone(digits(body.phone));
      const savedCpf = digits(profile.cpf);
      const cpf = cpfValid(savedCpf) ? savedCpf : digits(body.cpf);
      const parts = name.split(/\s+/);
      if (parts.length < 2 || !/^\d{10,11}$/.test(phone) || !cpfValid(cpf) || !user.email) {
        return reply({ error: 'Confira nome completo, WhatsApp, CPF e email cadastrado' }, 400);
      }
      const { error: saveError } = await db.from('profiles').update({ first_name: parts[0], last_name: parts.slice(1).join(' '), phone, cpf }).eq('user_id', user.id);
      if (saveError) return reply({ error: 'Não foi possível salvar os dados pessoais' }, 500);
      const { data, error } = await db.from('partner_onboarding_journey').update({ step_index: journey.step_index + 1 })
        .eq('user_id', user.id).eq('step_index', journey.step_index).select('*').maybeSingle();
      if (error || !data) return reply({ error: 'A etapa foi atualizada em outra sessão. Recarregue.' }, 409);
      journey = data;
      return state();
    }

    if (action === 'group') {
      if (current !== 'qualify-group') return reply({ error: 'Etapa indisponível' }, 409);
      if (journey.group_status !== 'idle') return state();
      const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
      const phone = nationalPhone(digits(profile.phone));
      const cpf = digits(profile.cpf);
      if (name.split(/\s+/).length < 2 || !/^\d{10,11}$/.test(phone) || !cpfValid(cpf) || !user.email) {
        return reply({ error: 'Dados pessoais incompletos' }, 400);
      }
      let target: URL;
      try { target = new URL(config.qualify_trigger_url); } catch { return reply({ error: 'URL da Qualify inválida' }, 503); }
      if (target.protocol !== 'https:' || target.hostname !== 'qualify-supabase.d2x.site') return reply({ error: 'URL da Qualify não permitida' }, 503);
      // A atualização condicional reivindica a única tentativa deste parceiro, mesmo com duas abas abertas.
      const claim = await db.from('partner_onboarding_journey').update({ group_status: 'requested' })
        .eq('user_id', user.id).eq('step_index', journey.step_index).eq('group_status', 'idle').select('*').maybeSingle();
      if (claim.error) return reply({ error: 'Não foi possível iniciar a criação do grupo' }, 500);
      if (!claim.data) { const latest = await load(); if (latest.data) journey = latest.data; return state(); }
      journey = claim.data;
      let response: Response;
      try {
        const token = Deno.env.get('QUALIFY_API_TOKEN');
        response = await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ request_id: journey.request_id, partner_id: user.id, name, email: user.email, phone: `+55${phone}`, cpf }),
          signal: AbortSignal.timeout(30000) });
      } catch {
        return reply({ error: 'A solicitação foi registrada, mas a resposta da Qualify não chegou. Contate o suporte para confirmar o grupo antes de tentar novamente.', journey }, 502);
      }
      const text = await response.text();
      let payload: unknown;
      try { payload = JSON.parse(text); } catch { payload = text; }
      if (!response.ok) return reply({ error: 'A Qualify não confirmou o grupo. Contate o suporte antes de tentar novamente.', journey }, 502);
      let normalized;
      try { normalized = normalizeQualifyResponse(payload); } catch {
        return reply({ error: 'A resposta da Qualify precisa ser conferida pelo suporte antes de uma nova tentativa.', journey }, 502);
      }
      if (normalized.status === 'pending') return state();
      const group = normalized.group;
      const saved = await db.from('partner_onboarding_journey').update({ group_status: 'ready', group_id: group.id, group_title: group.title,
        group_description: group.description, group_photo_url: group.photo_url, group_invite_url: group.invite_url,
        group_created_at: new Date().toISOString(), step_index: journey.step_index + 1 })
        .eq('user_id', user.id).eq('step_index', journey.step_index).eq('group_status', 'requested').select('*').maybeSingle();
      if (saved.error || !saved.data) return reply({ error: 'Grupo criado; a confirmação precisa ser conferida pelo suporte.', journey }, 500);
      journey = saved.data;
      return state();
    }

    if (action === 'join') {
      if (current !== 'join-group' || journey.group_status !== 'ready' || !journey.group_invite_url) return reply({ error: 'Entre no grupo antes de avançar' }, 409);
      const saved = await db.from('partner_onboarding_journey').update({ step_index: journey.step_index + 1, group_joined_at: new Date().toISOString() })
        .eq('user_id', user.id).eq('step_index', journey.step_index).select('*').maybeSingle();
      if (saved.error || !saved.data) return reply({ error: 'A etapa foi atualizada em outra sessão. Recarregue.' }, 409);
      journey = saved.data;
      return state();
    }

    if (!current || ['personal-data', 'qualify-group', 'join-group'].includes(current)) return reply({ error: 'Etapa indisponível' }, 409);
    if (current === 'connect-ml') {
      const connected = await db.from('mercadolivre_integrations').select('id').eq('user_id', user.id).eq('is_active', true).limit(1);
      if (connected.error) return reply({ error: 'Não foi possível verificar a integração com o Mercado Livre' }, 500);
      if (!connected.data?.length) return reply({ error: 'Conecte sua conta do Mercado Livre para avançar' }, 409);
    }
    if (current === 'publish-ml') {
      const { data: storeRows, error: storeError } = await db.from('reseller_products').select('product_id').eq('reseller_id', user.id).eq('active', true);
      if (storeError || !storeRows?.length) return reply({ error: 'Sua loja não possui produtos para publicar' }, 409);
      const published = await db.from('mercadolivre_published_products').select('product_id').eq('user_id', user.id).eq('status', 'published')
        .in('product_id', storeRows.map(row => row.product_id));
      if (published.error) return reply({ error: 'Não foi possível verificar os anúncios publicados' }, 500);
      if (new Set((published.data ?? []).map(item => item.product_id)).size < storeRows.length) return reply({ error: 'Publique todos os produtos da loja no Mercado Livre para avançar' }, 409);
    }
    if (current === 'import-top10') {
      const products = await top10();
      const imported = await db.from('reseller_products').select('product_id').eq('reseller_id', user.id).eq('active', true)
        .in('product_id', products.map(product => product.id));
      if (imported.error || new Set((imported.data ?? []).map(item => item.product_id)).size < products.length) {
        return reply({ error: 'Importe todos os produtos Top 10 antes de avançar' }, 409);
      }
    }
    const next = journey.step_index + 1;
    const saved = await db.from('partner_onboarding_journey').update({ step_index: next, ...(next >= steps.length ? { completed_at: new Date().toISOString() } : {}) })
      .eq('user_id', user.id).eq('step_index', journey.step_index).select('*').maybeSingle();
    if (saved.error || !saved.data) return reply({ error: 'A etapa foi atualizada em outra sessão. Recarregue.' }, 409);
    journey = saved.data;
    return state();
  } catch (error) {
    console.error('partner-onboarding:', error instanceof Error ? error.message : error);
    return reply({ error: 'Erro ao processar o onboarding' }, 500);
  }
});
