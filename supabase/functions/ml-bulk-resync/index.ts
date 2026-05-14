import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function getTokenForUser(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (!data) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
    const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
      body: { user_id: userId },
    });
    return refreshData?.access_token ?? data.access_token;
  }

  return data.access_token;
}

async function resyncReseller(userId: string): Promise<{ total: number; success: number; failed: number; errors: string[] }> {
  const token = await getTokenForUser(userId);
  if (!token) {
    return { total: 0, success: 0, failed: 0, errors: ['Token não encontrado'] };
  }

  // Buscar produtos publicados com ml_item_id
  const { data: published, error: pubError } = await supabase
    .from('mercadolivre_published_products')
    .select('id, product_id, ml_item_id')
    .eq('user_id', userId)
    .eq('status', 'published')
    .not('ml_item_id', 'is', null);

  if (pubError || !published || published.length === 0) {
    return { total: 0, success: 0, failed: 0, errors: [] };
  }

  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const item of published) {
    const mlItemId = item.ml_item_id;
    try {
      // 1. Pausar o anúncio
      const pauseRes = await fetch(`https://api.mercadolibre.com/items/${mlItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'paused' }),
      });

      if (!pauseRes.ok) {
        const pauseBody = await pauseRes.json().catch(() => ({}));
        const reason = pauseBody?.message ?? pauseRes.statusText;
        // Alguns itens podem já estar pausados ou ter outro status — ainda tentamos reativar
        if (pauseRes.status !== 400) {
          errors.push(`${mlItemId}: pause falhou (${reason})`);
          failed++;
          continue;
        }
      }

      // Pequeno delay para o ML processar
      await new Promise(r => setTimeout(r, 800));

      // 2. Reativar o anúncio
      const activateRes = await fetch(`https://api.mercadolibre.com/items/${mlItemId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'active' }),
      });

      if (!activateRes.ok) {
        const activateBody = await activateRes.json().catch(() => ({}));
        errors.push(`${mlItemId}: activate falhou (${activateBody?.message ?? activateRes.statusText})`);
        failed++;
        continue;
      }

      // 3. Atualizar timestamp em mercadolivre_published_products
      await supabase
        .from('mercadolivre_published_products')
        .update({ status: 'published', updated_at: new Date().toISOString() })
        .eq('id', item.id);

      success++;
      console.log(`[bulk-resync] ✅ ${mlItemId} re-synced for user ${userId}`);

    } catch (err) {
      errors.push(`${mlItemId}: ${String(err)}`);
      failed++;
    }
  }

  return { total: published.length, success, failed, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Verificar autenticação e role super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { reseller_user_id } = body;

    let targetUserIds: string[] = [];

    if (reseller_user_id) {
      targetUserIds = [reseller_user_id];
    } else {
      // Todos os revendedores com integração ativa
      const { data: integrations } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id')
        .eq('is_active', true);
      targetUserIds = (integrations ?? []).map((i: any) => i.user_id);
    }

    console.log(`[bulk-resync] Processing ${targetUserIds.length} reseller(s)`);

    const results: Record<string, { total: number; success: number; failed: number; errors: string[] }> = {};

    for (const userId of targetUserIds) {
      results[userId] = await resyncReseller(userId);
    }

    const totals = Object.values(results).reduce(
      (acc, r) => ({ total: acc.total + r.total, success: acc.success + r.success, failed: acc.failed + r.failed }),
      { total: 0, success: 0, failed: 0 }
    );

    return new Response(JSON.stringify({ success: true, ...totals, details: results }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[bulk-resync] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
