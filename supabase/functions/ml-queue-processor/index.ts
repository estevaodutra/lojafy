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

async function getIntegration(userId: string) {
  const { data } = await supabase
    .from('mercadolivre_integrations')
    .select('access_token, refresh_token, expires_at, ml_user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();
  return data;
}

async function getToken(userId: string): Promise<{ token: string; mlUserId: number } | null> {
  const integration = await getIntegration(userId);
  if (!integration) return null;

  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
  let token = integration.access_token;

  if (expiresAt && expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
    const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
      body: { user_id: userId },
    });
    token = refreshData?.access_token ?? token;
  }

  return { token, mlUserId: integration.ml_user_id };
}

async function fetchAllItems(token: string, mlUserId: number): Promise<string[]> {
  const ids: string[] = [];
  for (const status of ['active', 'paused']) {
    let offset = 0;
    while (true) {
      const res = await fetch(
        `https://api.mercadolibre.com/users/${mlUserId}/items/search?status=${status}&limit=100&offset=${offset}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) break;
      const data = await res.json();
      const results: string[] = data?.results ?? [];
      ids.push(...results);
      if (results.length < 100) break;
      offset += 100;
    }
  }
  return ids;
}

async function fetchItemDetails(token: string, ids: string[]): Promise<any[]> {
  const chunks: any[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    const res = await fetch(
      `https://api.mercadolibre.com/items?ids=${chunk.join(',')}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!res.ok) continue;
    const data = await res.json();
    chunks.push(...(data ?? []));
  }
  return chunks;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const { queue_id, reseller_user_id } = body;

    if (!queue_id || !reseller_user_id) {
      return new Response(JSON.stringify({ error: 'queue_id and reseller_user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ml-queue-processor] Processing queue_id=${queue_id} for user=${reseller_user_id}`);

    // Buscar token e ml_user_id
    const integration = await getToken(reseller_user_id);
    if (!integration) {
      await supabase.from('ml_sync_queue').update({
        status: 'failed',
        error_message: 'Token ML não encontrado ou integração inativa',
        processed_at: new Date().toISOString(),
      }).eq('id', queue_id);
      return new Response(JSON.stringify({ error: 'No active ML integration' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { token, mlUserId } = integration;

    // 1. Buscar TODOS os IDs de anúncios do revendedor (ativos + pausados)
    const allItemIds = await fetchAllItems(token, mlUserId);
    console.log(`[ml-queue-processor] Found ${allItemIds.length} items for user ${reseller_user_id}`);

    // 2. Buscar detalhes dos itens em chunks de 20
    const itemDetails = await fetchItemDetails(token, allItemIds);

    // 3. Buscar mapeamento ml_item_id → product_id do nosso banco
    const { data: publishedProducts } = await supabase
      .from('mercadolivre_published_products')
      .select('ml_item_id, product_id')
      .eq('user_id', reseller_user_id)
      .not('ml_item_id', 'is', null);

    const productMap = new Map<string, string>(
      (publishedProducts ?? []).map((p: any) => [p.ml_item_id, p.product_id])
    );

    // 4. Upsert em ml_listing_variants
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const itemWrapper of itemDetails) {
      const item = itemWrapper?.body ?? itemWrapper;
      if (!item?.id) continue;

      const mlItemId = String(item.id);
      const productId = productMap.get(mlItemId) ?? null;

      const mlStatus = item.status === 'active' ? 'published' : item.status === 'paused' ? 'paused' : 'closed';

      try {
        const { error } = await supabase
          .from('ml_listing_variants')
          .upsert({
            user_id: reseller_user_id,
            product_id: productId,
            ml_item_id: mlItemId,
            variant_title: item.title ?? 'Sem título',
            price: Number(item.price ?? 0),
            status: mlStatus,
            permalink: item.permalink ?? null,
            thumbnail: item.thumbnail ?? null,
            category_id: item.category_id ?? null,
            visits: Number(item.visits?.quantity ?? 0),
            sales: Number(item.sold_quantity ?? 0),
            last_synced_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id,ml_item_id',
          });

        if (error) {
          errors.push(`${mlItemId}: ${error.message}`);
          failed++;
        } else {
          imported++;
        }
      } catch (err) {
        errors.push(`${mlItemId}: ${String(err)}`);
        failed++;
      }
    }

    const result = {
      total: allItemIds.length,
      imported,
      failed,
      linked_to_product: productMap.size,
      errors: errors.slice(0, 10),
      duration_ms: Date.now() - startTime,
    };

    await supabase.from('ml_sync_queue').update({
      status: failed === allItemIds.length && allItemIds.length > 0 ? 'failed' : 'done',
      result,
      processed_at: new Date().toISOString(),
    }).eq('id', queue_id);

    console.log(`[ml-queue-processor] ✅ ${imported} imported, ${failed} failed`);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ml-queue-processor] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
