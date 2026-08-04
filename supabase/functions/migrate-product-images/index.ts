import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sanitizeAndRehostImage(url: string): Promise<string> {
  if (!url) return url;
  // Se a URL já estiver no nosso bucket product-images, não precisa reprocessar
  if (url.includes(supabaseUrl) && url.includes('product-images')) {
    return url;
  }

  try {
    console.log(`[migrate-images] Downloading external image: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.warn(`[migrate-images] Failed to download ${url}: ${response.status}`);
      return url;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await response.arrayBuffer());

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `migrated_${timestamp}_${randomHex}.${ext}`;
    const filePath = `catalog/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error('[migrate-images] Upload error:', uploadError);
      return url;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`[migrate-images] Successfully migrated: ${url} -> ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`[migrate-images] Error processing ${url}:`, err);
    return url;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[migrate-images] Starting batch image migration for existing products...');

    // 1. Buscar todos os produtos cadastrados
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, main_image_url, image_url, images');

    if (error) throw error;
    if (!products || products.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'Nenhum produto encontrado.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processedCount = 0;
    let updatedProductsCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      let newMainImage = product.main_image_url;
      let newImageUrl = product.image_url;
      let newImages: string[] = Array.isArray(product.images) ? [...product.images] : [];

      // Migrar main_image_url
      if (product.main_image_url && (!product.main_image_url.includes(supabaseUrl) || product.main_image_url.includes('mlstatic.com'))) {
        newMainImage = await sanitizeAndRehostImage(product.main_image_url);
        if (newMainImage !== product.main_image_url) needsUpdate = true;
        processedCount++;
      }

      // Migrar image_url
      if (product.image_url && (!product.image_url.includes(supabaseUrl) || product.image_url.includes('mlstatic.com'))) {
        newImageUrl = await sanitizeAndRehostImage(product.image_url);
        if (newImageUrl !== product.image_url) needsUpdate = true;
        processedCount++;
      }

      // Migrar array de imagens
      if (Array.isArray(product.images) && product.images.length > 0) {
        const sanitizedList: string[] = [];
        for (const img of product.images) {
          const u = typeof img === 'string' ? img : img?.url ?? img?.src ?? null;
          if (u) {
            const cleanUrl = await sanitizeAndRehostImage(u);
            sanitizedList.push(cleanUrl);
            if (cleanUrl !== u) needsUpdate = true;
            processedCount++;
          }
        }
        newImages = sanitizedList;
      }

      // Atualizar o produto se houve alteração de imagens
      if (needsUpdate) {
        const { error: updateErr } = await supabase
          .from('products')
          .update({
            main_image_url: newMainImage,
            image_url: newImageUrl,
            images: newImages,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);

        if (!updateErr) {
          updatedProductsCount++;
          console.log(`[migrate-images] Updated product ${product.id} (${product.name}) with new storage URLs.`);
        } else {
          console.error(`[migrate-images] Failed to update product ${product.id}:`, updateErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalProductsScanned: products.length,
        updatedProductsCount,
        imagesProcessedCount: processedCount,
        message: `Migração concluída com sucesso! ${updatedProductsCount} produtos atualizados no bucket product-images.`
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[migrate-images] Error during batch migration:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
