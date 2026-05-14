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

async function getValidToken(userId: string): Promise<string> {
  const { data: integration, error } = await supabase
    .from('mercadolivre_integrations')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .single();

  if (error || !integration) throw new Error('ML integration not found');

  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
  const needsRefresh = !expiresAt || expiresAt.getTime() < Date.now() + 10 * 60 * 1000;

  if (!needsRefresh) return integration.access_token;

  // Delegate to ml-token-refresh
  const { data, error: refreshErr } = await supabase.functions.invoke('ml-token-refresh', {
    body: { user_id: userId },
  });
  if (refreshErr || !data?.access_token) throw new Error('Token refresh failed');
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { product, reseller_price, marketplace_data, user_id, action, ml_item_id } = await req.json();

    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = await getValidToken(user_id);

    // ── Unpublish (pause) ────────────────────────────────────────────────────
    if (action === 'unpublish') {
      if (!ml_item_id) {
        return new Response(JSON.stringify({ error: 'ml_item_id required for unpublish' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const pauseRes = await fetch(`https://api.mercadolibre.com/items/${ml_item_id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'paused' }),
      });

      if (!pauseRes.ok) {
        const err = await pauseRes.json().catch(() => ({}));
        throw new Error(err.message || `ML API error: ${pauseRes.status}`);
      }

      console.log(`[ml-publish] ✅ Paused item ${ml_item_id}`);
      return new Response(JSON.stringify({ success: true, action: 'unpublished', ml_item_id }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Publish (create or re-activate) ─────────────────────────────────────
    if (!product) {
      return new Response(JSON.stringify({ error: 'product required for publish' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validated = marketplace_data?.validated_body ?? {};
    const price = reseller_price ?? product.price;

    // Re-activate existing listing
    if (ml_item_id) {
      const activateRes = await fetch(`https://api.mercadolibre.com/items/${ml_item_id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', price }),
      });

      if (!activateRes.ok) {
        const err = await activateRes.json().catch(() => ({}));
        throw new Error(err.message || `ML API error: ${activateRes.status}`);
      }

      const item = await activateRes.json();
      return new Response(JSON.stringify({ success: true, ml_item_id: item.id, permalink: item.permalink, status: item.status }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build pictures array from product images
    const imageUrls: string[] = [];
    if (product.main_image_url) imageUrls.push(product.main_image_url);
    if (Array.isArray(product.images)) {
      for (const img of product.images) {
        const u = typeof img === 'string' ? img : img?.url ?? img?.src ?? null;
        if (u && !imageUrls.includes(u)) imageUrls.push(u);
      }
    }
    if (imageUrls.length === 0 && product.image_url) imageUrls.push(product.image_url);

    const mlPayload: Record<string, unknown> = {
      title: product.name,
      category_id: validated.category_id ?? 'MLB1051',
      price: Number(price),
      currency_id: 'BRL',
      available_quantity: Number(product.stock_quantity ?? 10),
      buying_mode: 'buy_it_now',
      listing_type_id: validated.listing_type_id ?? 'gold_special',
      condition: validated.condition ?? 'new',
      description: { plain_text: product.description ?? product.name },
      pictures: imageUrls.slice(0, 12).map((url) => ({ source: url })),
    };

    // Shipping
    if (validated.shipping) {
      mlPayload.shipping = validated.shipping;
    } else {
      mlPayload.shipping = { mode: 'me2', free_shipping: false };
    }

    // Attributes
    if (Array.isArray(validated.attributes) && validated.attributes.length > 0) {
      mlPayload.attributes = validated.attributes;
    }

    // Dimensions / weight
    if (product.weight || product.height || product.length || product.width) {
      mlPayload.sale_terms = [
        ...(mlPayload.sale_terms as unknown[] ?? []),
      ];
    }

    console.log('[ml-publish] Creating item:', product.name, 'price:', price);

    const publishRes = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(mlPayload),
    });

    const responseBody = await publishRes.json();

    if (!publishRes.ok) {
      console.error('[ml-publish] ML API error:', publishRes.status, JSON.stringify(responseBody));
      const message = responseBody?.message ?? responseBody?.error ?? `ML API error ${publishRes.status}`;
      const cause = responseBody?.cause ?? [];
      return new Response(JSON.stringify({ error: message, cause, ml_response: responseBody }), {
        status: publishRes.status >= 400 && publishRes.status < 500 ? 422 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ml-publish] ✅ Published item ${responseBody.id}: ${responseBody.permalink}`);
    return new Response(
      JSON.stringify({ success: true, ml_item_id: responseBody.id, permalink: responseBody.permalink, status: responseBody.status }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ml-publish] Error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
