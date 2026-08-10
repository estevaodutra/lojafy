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
    console.warn('[ml-publish] Image sanitization failed, using original:', err);
    return url;
  }
}

function fixOrValidateGtin(gtin: any): { isValid: boolean; gtin: string } {
  const clean = (gtin ? String(gtin) : '').replace(/\D/g, '').trim();
  if (![8, 12, 13, 14].includes(clean.length)) {
    return { isValid: false, gtin: '' };
  }

  const digits = clean.split('').map(Number);
  const checkDigit = digits.pop()!;
  
  let sum = 0;
  const isOddLength = digits.length % 2 !== 0;
  digits.forEach((digit, i) => {
    const weight = (i % 2 === (isOddLength ? 0 : 1)) ? 3 : 1;
    sum += digit * weight;
  });

  const computedCheck = (10 - (sum % 10)) % 10;
  const isValid = computedCheck === checkDigit;
  return { isValid, gtin: isValid ? clean + String(checkDigit) : '' };
}

function autoFillAttribute(attr: any, product: any): { id: string; value_name: string; value_id?: string } | null {
  const attrId = (attr.id || '').toUpperCase();

  if (attrId === 'BRAND') return { id: 'BRAND', value_name: product.brand || 'Genérica' };
  if (attrId === 'MODEL') return { id: 'MODEL', value_name: product.model || 'Padrão' };
  if (attrId === 'PERFUME_NAME') return { id: 'PERFUME_NAME', value_name: (product.name || '').substring(0, 30) || 'Padrão' };

  // 1. Atributos numéricos de dimensão/peso/volume
  if (['HEIGHT', 'LENGTH', 'DEPTH', 'WIDTH', 'PACKAGE_HEIGHT', 'PACKAGE_LENGTH', 'PACKAGE_WIDTH'].includes(attrId)) {
    return { id: attrId, value_name: '10 cm' };
  }
  if (['WEIGHT', 'PACKAGE_WEIGHT'].includes(attrId)) {
    return { id: attrId, value_name: '1 kg' };
  }
  if (['UNIT_VOLUME', 'VOLUME'].includes(attrId)) {
    return { id: attrId, value_name: '100 ml' };
  }

  // 2. Atributos com tipo number_unit e unidades permitidas
  if (attr.value_type === 'number_unit' && Array.isArray(attr.allowed_units) && attr.allowed_units.length > 0) {
    const unitName = attr.allowed_units[0].name || attr.allowed_units[0].id || 'cm';
    return { id: attrId, value_name: `10 ${unitName}` };
  }

  // 3. Atributos numéricos simples
  if (attr.value_type === 'number' || attr.value_type === 'integer') {
    return { id: attrId, value_name: '1' };
  }

  // 4. Lista de valores pré-definidos (attr.values)
  if (Array.isArray(attr.values) && attr.values.length > 0) {
    const productNameLower = (product.name || '').toLowerCase();
    const matchedVal = attr.values.find((v: any) => v.name && productNameLower.includes(v.name.toLowerCase()));
    if (matchedVal) {
      return { id: attrId, value_name: matchedVal.name, value_id: matchedVal.id };
    }
    return { id: attrId, value_name: attr.values[0].name, value_id: attr.values[0].id };
  }

  // 5. Booleanos
  if (attr.value_type === 'boolean') {
    return { id: attrId, value_name: 'Não' };
  }

  return { id: attrId, value_name: 'Padrão' };
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
    let attributes: any[] = Array.isArray(validated.attributes) && validated.attributes.length > 0
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
                const filled = autoFillAttribute(attr, product);
                if (filled) {
                  console.log(`[ml-publish] Auto-filling required attribute ${attr.id} with:`, filled);
                  attributes.push(filled);
                }
              }
            }
          }
        }
      } catch (err) {
        console.warn('[ml-publish] Failed to fetch category attributes or auto-fill:', err);
      }
    }

    // Garantir que GTIN ou EMPTY_GTIN_REASON esteja nos atributos de forma totalmente válida
    const gtinVal = product.gtin_ean13 || product.gtin || product.barcode || product.ean;
    const validatedGtin = fixOrValidateGtin(gtinVal);
    const hasGtin = attributes.some((a: any) => a.id === 'GTIN');
    const hasEmptyGtinReason = attributes.some((a: any) => a.id === 'EMPTY_GTIN_REASON');

    if (!hasGtin && !hasEmptyGtinReason) {
      if (validatedGtin.isValid) {
        attributes.push({ id: 'GTIN', value_name: validatedGtin.gtin });
      } else {
        attributes.push({ id: 'EMPTY_GTIN_REASON', value_name: 'Outro motivo', value_id: '9370803' });
      }
    } else if (hasGtin) {
      if (!validatedGtin.isValid) {
        attributes = attributes.filter((a: any) => a.id !== 'GTIN');
        attributes.push({ id: 'EMPTY_GTIN_REASON', value_name: 'Outro motivo', value_id: '9370803' });
      } else {
        attributes = attributes.map((a: any) => a.id === 'GTIN' ? { ...a, value_name: validatedGtin.gtin } : a);
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

    let publishRes = await fetch('https://api.mercadolibre.com/items', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(mlPayload),
    });

    let responseBody = await publishRes.json();

    // ── Auto-retry loop for recoverable ML API errors (up to 5 attempts) ────
    let retryCount = 0;
    while (!publishRes.ok && retryCount < 5) {
      retryCount++;
      const errStr = JSON.stringify(responseBody);
      console.warn(`[ml-publish] Falha na publicação (Tentativa ${retryCount}):`, errStr);
      let modified = false;

      // 1. Categoria Migrada ("Category id migrated to: MLB6284")
      const catMigratedMatch = errStr.match(/Category id migrated to: (MLB\d+)/i);
      if (catMigratedMatch) {
        const newCat = catMigratedMatch[1];
        console.log(`[ml-publish] 🔄 AUTOCORREÇÃO DE CATEGORIA MIGRADA: Atualizando para ${newCat}...`);
        mlPayload.category_id = newCat;
        modified = true;
      }

      // 2. Categoria Raiz / Não-Folha ("Is not allowed to post in category MLB1051")
      if (/MLB1051|leaf category|category/i.test(errStr) && !catMigratedMatch) {
        console.log('[ml-publish] 🔄 AUTOCORREÇÃO DE CATEGORIA: Categoria não-folha. Atribuindo categoria folha...');
        mlPayload.category_id = 'MLB1271';
        modified = true;
      }

      // 3. Frete Grátis Obrigatório ("Mandatory free shipping added" / price >= 79)
      if (/Mandatory free shipping|free shipping/i.test(errStr) || Number(price) >= 79) {
        console.log('[ml-publish] 🔄 AUTOCORREÇÃO DE FRETE GRÁTIS: Ativando free_shipping...');
        const currShipping = (mlPayload.shipping as any) || { mode: 'me2' };
        mlPayload.shipping = { ...currShipping, free_shipping: true };
        modified = true;
      }

      // 4. Correção de GTIN / EMPTY_GTIN_REASON
      if (/EMPTY_GTIN_REASON|GTIN|Product Identifier|invalid format/i.test(errStr)) {
        console.log('[ml-publish] 🔄 AUTOCORREÇÃO DE GTIN: Limpando / reformatando GTIN...');
        let currentAttrs = (mlPayload.attributes as any[] || []).filter((a: any) => a.id !== 'GTIN' && a.id !== 'EMPTY_GTIN_REASON');
        if (!/EMPTY_GTIN_REASON/i.test(errStr)) {
          currentAttrs.push({ id: 'EMPTY_GTIN_REASON', value_name: 'Outro motivo' });
        }
        mlPayload.attributes = currentAttrs;
        modified = true;
      }

      // 5. Atributos "Padrão" enviados para campos de unidade numérica (HEIGHT, LENGTH, DEPTH, UNIT_VOLUME, etc.)
      const padraoMatch = errStr.match(/Attribute ([A-Z0-9_]+) with value Padrão is required/gi);
      if (padraoMatch) {
        let currentAttrs = (mlPayload.attributes as any[] || []);
        for (const matchStr of padraoMatch) {
          const idMatch = matchStr.match(/Attribute ([A-Z0-9_]+) with/i);
          if (idMatch) {
            const attrId = idMatch[1];
            console.log(`[ml-publish] 🔄 AUTOCORREÇÃO NUMÉRICA: Substituindo "Padrão" em ${attrId} por unidade numérica válida...`);
            currentAttrs = currentAttrs.filter((a: any) => a.id !== attrId);
            const filled = autoFillAttribute({ id: attrId, value_type: 'number_unit' }, product);
            if (filled) currentAttrs.push(filled);
            modified = true;
          }
        }
        mlPayload.attributes = currentAttrs;
      }

      // 6. Atributos obrigatórios ausentes por id (ex: PERFUME_NAME, UNIT_VOLUME, etc.)
      const missingAttrsMatch = errStr.match(/The attributes? \[([A-Z0-9_,\s]+)\] (?:are|is) required/i);
      const missingCampoMatch = errStr.match(/O campo "([^"]+)" é obrigatório/g);

      if (missingAttrsMatch || missingCampoMatch) {
        let currentAttrs = (mlPayload.attributes as any[] || []);

        if (missingAttrsMatch) {
          const rawAttrIds = missingAttrsMatch[1].split(',').map(s => s.trim());
          for (const attrId of rawAttrIds) {
            if (!currentAttrs.some((a: any) => a.id === attrId)) {
              const filled = autoFillAttribute({ id: attrId, value_type: 'string' }, product);
              if (filled) {
                console.log(`[ml-publish] 🔄 AUTOCORREÇÃO DE ATRIBUTO OBRIGATÓRIO: Injetando ${attrId}:`, filled);
                currentAttrs.push(filled);
                modified = true;
              }
            }
          }
        }

        if (missingCampoMatch) {
          for (const matchStr of missingCampoMatch) {
            const fieldName = matchStr.replace(/O campo "/, '').replace(/" é obrigatório/, '').trim().toLowerCase();
            if (fieldName.includes('marca') && !currentAttrs.some((a: any) => a.id === 'BRAND')) {
              currentAttrs.push({ id: 'BRAND', value_name: product.brand || 'Genérica' });
              modified = true;
            } else if (fieldName.includes('modelo') && !currentAttrs.some((a: any) => a.id === 'MODEL')) {
              currentAttrs.push({ id: 'MODEL', value_name: product.model || 'Padrão' });
              modified = true;
            } else if (fieldName.includes('perfume') && !currentAttrs.some((a: any) => a.id === 'PERFUME_NAME')) {
              currentAttrs.push({ id: 'PERFUME_NAME', value_name: (product.name || '').substring(0, 30) || 'Padrão' });
              modified = true;
            } else if (fieldName.includes('volume') && !currentAttrs.some((a: any) => a.id === 'UNIT_VOLUME')) {
              currentAttrs.push({ id: 'UNIT_VOLUME', value_name: '100 ml' });
              modified = true;
            }
          }
        }
        mlPayload.attributes = currentAttrs;
      }

      // 7. Ajuste de Modo de Frete (me1, me2)
      if (/mode me1|mode me2|mode/i.test(errStr) && !modified) {
        console.log('[ml-publish] 🔄 AUTOCORREÇÃO DE MODO DE FRETE: Ajustando frete...');
        mlPayload.shipping = { mode: 'not_specified', free_shipping: Number(price) >= 79 };
        modified = true;
      }

      if (!modified) {
        console.log('[ml-publish] Aplicando retentativa genérica ampla com Brand, Model e not_specified...');
        const currentAttrs = (mlPayload.attributes as any[] || []);
        if (!currentAttrs.some((a: any) => a.id === 'BRAND')) currentAttrs.push({ id: 'BRAND', value_name: product.brand || 'Genérica' });
        if (!currentAttrs.some((a: any) => a.id === 'MODEL')) currentAttrs.push({ id: 'MODEL', value_name: product.model || 'Padrão' });
        mlPayload.attributes = currentAttrs;
        break; // Sai do loop para evitar repetições infinitas se nada mudou
      }

      console.log(`[ml-publish] 🚀 REPUBLICANDO AUTOMATICAMENTE (Tentativa ${retryCount + 1})...`);
      publishRes = await fetch('https://api.mercadolibre.com/items', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(mlPayload),
      });

      responseBody = await publishRes.json();
    }


    if (!publishRes.ok) {
      console.error('[ml-publish] ML API error final:', publishRes.status, JSON.stringify(responseBody));
      const message = responseBody?.message ?? responseBody?.error ?? `ML API error ${publishRes.status}`;
      const causes: string[] = (responseBody?.cause ?? []).map((c: any) => c.message ?? JSON.stringify(c));
      const fullMessage = causes.length > 0 ? `${message} — cause: ${causes.join('; ')}` : message;
      
      // Retornar HTTP 200 com success: false para que o cliente exiba a mensagem exata sem a mensagem genérica "non-2xx status code"
      return new Response(JSON.stringify({ 
        success: false, 
        error: fullMessage, 
        cause: causes, 
        ml_response: responseBody 
      }), {
        status: 200,
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
