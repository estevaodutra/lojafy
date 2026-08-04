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

async function sanitizeImageForMl(url: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!url) return url;
  if (!url.includes('mlstatic.com') && url.includes(supabaseUrl) && url.includes('product-images')) {
    return url;
  }
  
  try {
    console.log(`[ml-publish] Sanitizing image for ML: ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return url;
    
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await res.arrayBuffer());
    
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const filePath = `sanitized/ml_clean_${timestamp}_${randomHex}.${ext}`;
    
    const { data: uploadData, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType, upsert: true });
      
    if (error) {
      console.warn('[ml-publish] Upload to product-images failed:', error);
      return url;
    }
    
    const { data: pubData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    const publicDomain = Deno.env.get('SUPABASE_PUBLIC_URL') || 'https://lojafy-supabase.d2x.site';
    const cleanPublicUrl = pubData.publicUrl.replace(/^http:\/\/(kong|localhost|127\.0\.0\.1):8000/, publicDomain);
    
    console.log(`[ml-publish] Image sanitized successfully. New URL: ${cleanPublicUrl}`);
    return cleanPublicUrl;
  } catch (err) {
    console.warn(`[ml-publish] Image sanitization failed for ${url}:`, err);
    return url;
  }
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

    // ── Unpublish (close and delete) ─────────────────────────────────────────
    if (action === 'unpublish') {
      if (!ml_item_id) {
        return new Response(JSON.stringify({ error: 'ml_item_id required for unpublish' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log(`[ml-publish] Closing item ${ml_item_id}...`);
      const closeRes = await fetch(`https://api.mercadolibre.com/items/${ml_item_id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'closed' }),
      });

      if (!closeRes.ok) {
        const err = await closeRes.json().catch(() => ({}));
        throw new Error(err.message || `ML API error when closing: ${closeRes.status}`);
      }

      console.log(`[ml-publish] Deleting item ${ml_item_id}...`);
      try {
        const deleteRes = await fetch(`https://api.mercadolibre.com/items/${ml_item_id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ deleted: 'true' }),
        });
        if (!deleteRes.ok) {
          const deleteErr = await deleteRes.json().catch(() => ({}));
          console.warn(`[ml-publish] Could not delete item completely (maybe it has bids): ${deleteRes.status}`, deleteErr);
        } else {
          console.log(`[ml-publish] ✅ Item ${ml_item_id} deleted successfully from Mercado Livre`);
        }
      } catch (e) {
        console.warn(`[ml-publish] Exception during delete item request:`, e);
      }

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
    // Arredondar preco para 2 casas decimais (exigencia da API do ML)
    const rawPrice = reseller_price ?? product.price;
    const price = Math.round(Number(rawPrice) * 100) / 100;

    let activeMlItemId = ml_item_id;

    // Re-activate existing listing
    if (activeMlItemId) {
      console.log(`[ml-publish] Attempting to reactivate existing item ${activeMlItemId}...`);
      const activateRes = await fetch(`https://api.mercadolibre.com/items/${activeMlItemId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', price: Math.round(Number(price) * 100) / 100 }),
      });

      if (!activateRes.ok) {
        const err = await activateRes.json().catch(() => ({}));
        const errMsg = err.message || `ML API error: ${activateRes.status}`;
        
        if (
          activateRes.status === 404 || 
          activateRes.status === 400 ||
          errMsg.includes('status:closed') || 
          errMsg.includes('status:inactive') || 
          errMsg.includes('Cannot update item') ||
          errMsg.includes('not_found')
        ) {
          console.warn(`[ml-publish] Existing item ${activeMlItemId} is closed, not found, or invalid. Clearing and creating new listing...`);
          
          await supabase
            .from('mercadolivre_published_products')
            .delete()
            .eq('user_id', user_id)
            .eq('ml_item_id', activeMlItemId);
          
          await supabase
            .from('ml_listing_variants')
            .update({ ml_item_id: null, status: 'draft', permalink: null })
            .eq('user_id', user_id)
            .eq('ml_item_id', activeMlItemId);

          activeMlItemId = null; // Zera para cair no fluxo de criação de anúncio novo
        } else {
          throw new Error(errMsg);
        }
      } else {
        const item = await activateRes.json();
        return new Response(JSON.stringify({ success: true, ml_item_id: item.id, permalink: item.permalink, status: item.status }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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

    // Se não tem categoria ML definida, buscar automaticamente pelo nome do produto
    let categoryId = validated.category_id;
    if (!categoryId) {
      try {
        const searchQuery = encodeURIComponent(product.name.substring(0, 50));
        const catRes = await fetch(
          `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${searchQuery}&limit=1`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (catRes.ok) {
          const catData = await catRes.json();
          categoryId = catData?.[0]?.category_id ?? null;
          if (categoryId) console.log(`[ml-publish] Auto-detected category: ${categoryId} for "${product.name}"`);
        }
      } catch (e) {
        console.warn('[ml-publish] Category auto-detection failed:', e);
      }
    }

    // Construir atributos do produto usando os dados que temos
    const attributes: any[] = Array.isArray(validated.attributes) && validated.attributes.length > 0
      ? [...validated.attributes]
      : [];

    // Adicionar peso e dimensões como atributos se disponíveis
    if (product.weight && attributes.findIndex((a: any) => a.id === 'WEIGHT') === -1) {
      attributes.push({ id: 'WEIGHT', value_name: `${product.weight} kg` });
    }

    // Buscar atributos obrigatórios da categoria para auto-preencher valores ausentes
    if (categoryId) {
      try {
        console.log(`[ml-publish] Fetching attributes for category ${categoryId}...`);
        const catAttrsRes = await fetch(`https://api.mercadolibre.com/categories/${categoryId}/attributes`);
        if (catAttrsRes.ok) {
          const catAttrs = await catAttrsRes.json();
          for (const attr of catAttrs) {
            const isRequired = attr.tags?.required === true || attr.tags?.catalog_required === true;
            if (isRequired) {
              const exists = attributes.some((a: any) => a.id === attr.id);
              if (!exists) {
                let value_name = '';
                let value_id = undefined;

                if (attr.id === 'BRAND') {
                  value_name = product.brand || 'Genérica';
                } else if (attr.id === 'MODEL') {
                  value_name = product.model || 'Padrão';
                } else if (Array.isArray(attr.values) && attr.values.length > 0) {
                  const productNameLower = (product.name || '').toLowerCase();
                  const matchedVal = attr.values.find((v: any) => 
                    v.name && productNameLower.includes(v.name.toLowerCase())
                  );
                  if (matchedVal) {
                    value_id = matchedVal.id;
                    value_name = matchedVal.name;
                  } else {
                    value_id = attr.values[0].id;
                    value_name = attr.values[0].name;
                  }
                } else if (attr.value_type === 'boolean') {
                  value_name = 'Não';
                } else {
                  value_name = 'Padrão';
                }

                console.log(`[ml-publish] Auto-filling required attribute ${attr.id} with:`, { value_name, value_id });
                attributes.push({
                  id: attr.id,
                  ...(value_id ? { value_id } : {}),
                  value_name
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('[ml-publish] Failed to fetch category attributes or auto-fill:', err);
      }
    }

    // Sanitizar imagens (garantir que não sejam links brutos do mlstatic.com)
    console.log('[ml-publish] Sanitizing product pictures prior to Mercado Livre payload creation...');
    const sanitizedImageUrls: string[] = [];
    for (const url of imageUrls.slice(0, 12)) {
      const cleanUrl = await sanitizeImageForMl(url);
      sanitizedImageUrls.push(cleanUrl);
    }

    const mlPayload: Record<string, unknown> = {
      title: product.name.substring(0, 60), // ML limita título a 60 chars
      category_id: categoryId ?? 'MLB1051',  // fallback: Outros
      price: Math.round(Number(price) * 100) / 100,
      currency_id: 'BRL',
      available_quantity: Number(product.stock_quantity ?? 10),
      buying_mode: 'buy_it_now',
      listing_type_id: validated.listing_type_id ?? 'gold_pro',
      condition: validated.condition ?? 'new',
      pictures: sanitizedImageUrls.map((url) => ({ source: url })),
    };

    // Shipping: default to me2 unless verified otherwise. Force me2 if it is me1 to avoid "User has not mode me1" error
    let shipping = validated.shipping ?? { mode: 'me2', free_shipping: false };
    if (shipping.mode === 'me1') {
      shipping = { ...shipping, mode: 'me2' };
    }
    mlPayload.shipping = shipping;

    // Attributes
    if (attributes.length > 0) {
      mlPayload.attributes = attributes;
    }

    console.log('[ml-publish] Creating item:', product.name, 'category:', mlPayload.category_id, 'price:', price);

    const publishRes = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(mlPayload),
    });

    const responseBody = await publishRes.json();

    if (!publishRes.ok) {
      console.error('[ml-publish] ML API error:', publishRes.status, JSON.stringify(responseBody));
      const message = responseBody?.message ?? responseBody?.error ?? `ML API error ${publishRes.status}`;
      const causes: string[] = (responseBody?.cause ?? []).map((c: any) => c.message ?? JSON.stringify(c));
      const fullMessage = causes.length > 0 ? `${message} — cause: ${causes.join('; ')}` : message;
      return new Response(JSON.stringify({ error: fullMessage, cause: causes, ml_response: responseBody }), {
        status: publishRes.status >= 400 && publishRes.status < 500 ? 422 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ml-publish] ✅ Published item ${responseBody.id}: ${responseBody.permalink}`);

    // Adicionar descrição em chamada separada
    const descriptionText = (product.description ?? product.name).substring(0, 50000);
    if (descriptionText) {
      console.log(`[ml-publish] Adding description to item ${responseBody.id}`);
      try {
        const descRes = await fetch(`https://api.mercadolibre.com/items/${responseBody.id}/description`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ plain_text: descriptionText }),
        });
        if (!descRes.ok) {
          const descErrBody = await descRes.json().catch(() => ({}));
          console.error('[ml-publish] Failed to add description to ML item:', descRes.status, descErrBody);
        } else {
          console.log(`[ml-publish] ✅ Description added to item ${responseBody.id}`);
        }
      } catch (e) {
        console.error('[ml-publish] Error adding description to ML item:', e);
      }
    }

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
