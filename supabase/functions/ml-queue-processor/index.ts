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
    .maybeSingle();
  return data;
}

async function getToken(userId: string): Promise<{ token: string; mlUserId: number } | null> {
  const integration = await getIntegration(userId);
  if (!integration) return null;

  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
  let token = integration.access_token;

  if (!token || !expiresAt || expiresAt.getTime() < Date.now() + 10 * 60 * 1000) {
    try {
      const { data: refreshData } = await supabase.functions.invoke('ml-token-refresh', {
        body: { user_id: userId, force: true },
      });
      if (refreshData?.access_token) {
        token = refreshData.access_token;
      }
    } catch (err) {
      console.warn(`[ml-queue-processor] Falha ao renovar token para ${userId}:`, err);
    }
  }

  return { token, mlUserId: integration.ml_user_id };
}

async function fetchAllItems(token: string, mlUserId: number): Promise<string[]> {
  const ids: string[] = [];
  for (const status of ['active', 'paused']) {
    let offset = 0;
    while (true) {
      try {
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
      } catch (err) {
        console.warn(`[ml-queue-processor] Erro ao buscar itens offset=${offset}:`, err);
        break;
      }
    }
  }
  return ids;
}

async function fetchItemDetails(token: string, ids: string[]): Promise<any[]> {
  const chunks: any[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const chunk = ids.slice(i, i + 20);
    try {
      const res = await fetch(
        `https://api.mercadolibre.com/items?ids=${chunk.join(',')}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) continue;
      const data = await res.json();
      chunks.push(...(data ?? []));
    } catch (err) {
      console.warn(`[ml-queue-processor] Erro ao buscar detalhes chunk:`, err);
    }
  }
  return chunks;
}

async function processResellerItems(resellerUserId: string, queueId?: string) {
  const startTime = Date.now();
  console.log(`[ml-queue-processor] Sincronizando anúncios para reseller=${resellerUserId}`);

  if (queueId) {
    await supabase.from('ml_sync_queue').update({
      status: 'processing',
      started_at: new Date().toISOString(),
    }).eq('id', queueId);
  }

  const integration = await getToken(resellerUserId);
  if (!integration || !integration.token || !integration.mlUserId) {
    if (queueId) {
      await supabase.from('ml_sync_queue').update({
        status: 'failed',
        error_message: 'Token ML não encontrado ou integração inativa',
        processed_at: new Date().toISOString(),
      }).eq('id', queueId);
    }
    return { success: false, error: 'Integração ML inativa ou sem token' };
  }

  const { token, mlUserId } = integration;

  // 1. Buscar todos os IDs de anúncios do revendedor
  const allItemIds = await fetchAllItems(token, mlUserId);
  console.log(`[ml-queue-processor] Encontrados ${allItemIds.length} anúncios para user ${resellerUserId}`);

  if (allItemIds.length === 0) {
    if (queueId) {
      await supabase.from('ml_sync_queue').update({
        status: 'done',
        result: { total: 0, imported: 0, failed: 0, message: 'Nenhum anúncio cadastrado no ML' },
        processed_at: new Date().toISOString(),
      }).eq('id', queueId);
    }
    return { success: true, total: 0, imported: 0, failed: 0 };
  }

  // 2. Buscar detalhes dos anúncios em blocos de 20
  const itemDetails = await fetchItemDetails(token, allItemIds);

  // 3. Mapear produtos vinculados existentes
  const { data: publishedProducts } = await supabase
    .from('mercadolivre_published_products')
    .select('ml_item_id, product_id')
    .eq('user_id', resellerUserId)
    .not('ml_item_id', 'is', null);

  const productMap = new Map<string, string>(
    (publishedProducts ?? []).map((p: any) => [p.ml_item_id, p.product_id])
  );

  // 4. Salvar ou atualizar em ml_listing_variants
  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const itemWrapper of itemDetails) {
    const item = itemWrapper?.body ?? itemWrapper;
    if (!item?.id) continue;

    const mlItemId = String(item.id);
    const productId = productMap.get(mlItemId) ?? null;
    const mlStatus = item.status === 'active' ? 'published' : item.status === 'paused' ? 'paused' : 'closed';
    const thumbUrl = item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url || item.thumbnail || null;

    try {
      // Verificar se já existe
      const { data: existing } = await supabase
        .from('ml_listing_variants')
        .select('id')
        .eq('user_id', resellerUserId)
        .eq('ml_item_id', mlItemId)
        .maybeSingle();

      const variantData = {
        user_id: resellerUserId,
        product_id: productId,
        ml_item_id: mlItemId,
        variant_title: item.title ?? 'Sem título',
        price: Number(item.price ?? 0),
        status: mlStatus,
        permalink: item.permalink ?? null,
        thumbnail: thumbUrl,
        category_id: item.category_id ?? null,
        visits: 0,
        sales: Number(item.sold_quantity ?? 0),
        last_synced_at: new Date().toISOString(),
      };

      let dbError;
      if (existing?.id) {
        const { error } = await supabase
          .from('ml_listing_variants')
          .update(variantData)
          .eq('id', existing.id);
        dbError = error;
      } else {
        const { error } = await supabase
          .from('ml_listing_variants')
          .insert(variantData);
        dbError = error;
      }

      if (dbError) {
        errors.push(`${mlItemId}: ${dbError.message}`);
        failed++;
      } else {
        imported++;
      }
    } catch (err: any) {
      errors.push(`${mlItemId}: ${err.message}`);
      failed++;
    }
  }

  const result = {
    total: allItemIds.length,
    imported,
    failed,
    linked_to_product: productMap.size,
    errors: errors.slice(0, 5),
    duration_ms: Date.now() - startTime,
  };

  if (queueId) {
    await supabase.from('ml_sync_queue').update({
      status: failed === allItemIds.length && allItemIds.length > 0 ? 'failed' : 'done',
      result,
      processed_at: new Date().toISOString(),
    }).eq('id', queueId);
  }

  console.log(`[ml-queue-processor] ✅ ${imported} anúncios sincronizados com sucesso.`);
  return { success: true, ...result };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { queue_id, reseller_user_id, mode } = body;

    // Modo 1: Sincronizar todas as contas ativas do Mercado Livre
    if (mode === 'sync_all_active') {
      const { data: activeIntegrations } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id')
        .eq('is_active', true);

      if (!activeIntegrations?.length) {
        return new Response(JSON.stringify({ success: true, message: 'Nenhuma conta ativa encontrada', total: 0 }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[ml-queue-processor] Sincronizando todas as ${activeIntegrations.length} contas ativas...`);
      const results = [];
      for (const intg of activeIntegrations) {
        const res = await processResellerItems(intg.user_id);
        results.push({ user_id: intg.user_id, ...res });
        // Delay suave para respeitar limites da API do ML
        await new Promise(r => setTimeout(r, 400));
      }

      // Marcar fila como concluída
      await supabase.from('ml_sync_queue').update({
        status: 'done',
        processed_at: new Date().toISOString(),
      }).in('status', ['pending', 'processing']);

      return new Response(JSON.stringify({ success: true, accounts: activeIntegrations.length, results }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Modo 2: Processar fila pendente
    if (mode === 'process_all_pending' || (!reseller_user_id && !queue_id)) {
      const { data: pendingRows } = await supabase
        .from('ml_sync_queue')
        .select('id, user_id')
        .in('status', ['pending', 'processing'])
        .limit(20);

      if (!pendingRows?.length) {
        return new Response(JSON.stringify({ success: true, message: 'Nenhum item pendente na fila', processed: 0 }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results = [];
      for (const row of pendingRows) {
        const res = await processResellerItems(row.user_id, row.id);
        results.push({ queue_id: row.id, user_id: row.user_id, ...res });
      }

      return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Modo 3: Sincronizar revendedor específico diretamente
    if (reseller_user_id) {
      const res = await processResellerItems(reseller_user_id, queue_id);
      return new Response(JSON.stringify(res), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Parâmetro inválido' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('[ml-queue-processor] Erro geral:', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
