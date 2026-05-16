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

    // Buscar token ML do revendedor
    const token = await getTokenForUser(reseller_user_id);
    if (!token) {
      await supabase.from('ml_sync_queue').update({
        status: 'failed',
        error_message: 'Token ML não encontrado ou integração inativa',
        processed_at: new Date().toISOString(),
      }).eq('id', queue_id);

      return new Response(JSON.stringify({ error: 'No active ML integration' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar produtos publicados do revendedor
    const { data: published } = await supabase
      .from('mercadolivre_published_products')
      .select('id, product_id, ml_item_id')
      .eq('user_id', reseller_user_id)
      .eq('status', 'published')
      .not('ml_item_id', 'is', null);

    const items = published ?? [];
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      const mlItemId = item.ml_item_id;
      try {
        // Pausar
        const pauseRes = await fetch(`https://api.mercadolibre.com/items/${mlItemId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'paused' }),
        });

        if (!pauseRes.ok && pauseRes.status !== 400) {
          errors.push(`${mlItemId}: pause falhou (${pauseRes.status})`);
          failed++;
          continue;
        }

        await new Promise(r => setTimeout(r, 800));

        // Reativar
        const activateRes = await fetch(`https://api.mercadolibre.com/items/${mlItemId}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'active' }),
        });

        if (!activateRes.ok) {
          const body = await activateRes.json().catch(() => ({}));
          errors.push(`${mlItemId}: activate falhou (${body?.message ?? activateRes.status})`);
          failed++;
          continue;
        }

        // Atualizar timestamp
        await supabase.from('mercadolivre_published_products')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', item.id);

        success++;
      } catch (err) {
        errors.push(`${mlItemId}: ${String(err)}`);
        failed++;
      }
    }

    const result = {
      total: items.length,
      success,
      failed,
      errors,
      duration_ms: Date.now() - startTime,
    };

    // Atualizar status da fila
    await supabase.from('ml_sync_queue').update({
      status: failed === items.length && items.length > 0 ? 'failed' : 'done',
      result,
      processed_at: new Date().toISOString(),
    }).eq('id', queue_id);

    console.log(`[ml-queue-processor] ✅ Done: ${success} ok, ${failed} failed`);
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[ml-queue-processor] Error:', err);
    if (req.body) {
      try {
        const { queue_id } = await req.json().catch(() => ({}));
        if (queue_id) {
          await supabase.from('ml_sync_queue').update({
            status: 'failed',
            error_message: String(err),
            processed_at: new Date().toISOString(),
          }).eq('id', queue_id);
        }
      } catch { /* ignore */ }
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
