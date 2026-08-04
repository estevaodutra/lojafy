import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sanitizeSingleImage(imageUrl: string): Promise<string> {
  // Se a URL já estiver hospedada no nosso Supabase Storage, não precisa re-enviar
  if (imageUrl.includes(supabaseUrl) && imageUrl.includes('product-images')) {
    return imageUrl;
  }

  try {
    console.log(`[ml-sanitize-image] Fetching image from external source: ${imageUrl}`);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.warn(`[ml-sanitize-image] Failed to download image ${imageUrl}, status: ${response.status}`);
      return imageUrl; // Fallback para URL original se download falhar
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Determinar extensão
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `ml_clean_${timestamp}_${randomHex}.${ext}`;
    const filePath = `sanitized/${fileName}`;

    console.log(`[ml-sanitize-image] Uploading clean image to product-images bucket: ${filePath}`);
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, {
        contentType,
        upsert: true,
      });

    if (error) {
      console.error('[ml-sanitize-image] Upload error to product-images bucket:', error);
      return imageUrl;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    const publicDomain = Deno.env.get('SUPABASE_PUBLIC_URL') || 'https://lojafy-supabase.d2x.site';
    const cleanPublicUrl = publicData.publicUrl.replace(/^http:\/\/(kong|localhost|127\.0\.0\.1):8000/, publicDomain);
    
    console.log(`[ml-sanitize-image] Successfully sanitized image. New URL: ${cleanPublicUrl}`);
    return cleanPublicUrl;
  } catch (err) {
    console.error(`[ml-sanitize-image] Error sanitizing image ${imageUrl}:`, err);
    return imageUrl;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body.urls) 
      ? body.urls 
      : body.url 
      ? [body.url] 
      : [];

    if (urls.length === 0) {
      return new Response(JSON.stringify({ error: 'No image URLs provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[ml-sanitize-image] Processing ${urls.length} images...`);
    const mapping: Record<string, string> = {};
    const sanitizedUrls: string[] = [];

    for (const url of urls) {
      const cleanUrl = await sanitizeSingleImage(url);
      mapping[url] = cleanUrl;
      sanitizedUrls.push(cleanUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sanitizedUrls,
        mapping,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[ml-sanitize-image] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
