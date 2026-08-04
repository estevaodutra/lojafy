import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PRODUCT_ID = 'c035d8b4-cac3-4aa1-ae29-54e494c39f17';

// 5 URLs de imagens REAIS e testadas de alta definição da Mini Balança Digital 500g
const VALID_ML_IMAGES = [
  'https://http2.mlstatic.com/D_NQ_NP_2X_731342-MLA100115091481_122025-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_669708-MLB46684725055_072021-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_892701-MLB46684725056_072021-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_973166-MLB46684725057_072021-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_706596-MLB46684725058_072021-F.jpg'
];

async function verifyAndUpload(url, index) {
  try {
    console.log(`[Photo ${index + 1}] Downloading: ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!res.ok) {
      console.error(`[Photo ${index + 1}] HTTP Error: ${res.status}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await res.arrayBuffer());

    if (bytes.length < 1000) {
      console.error(`[Photo ${index + 1}] Image file too small (${bytes.length} bytes), invalid image.`);
      return null;
    }

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `balanca_gallery_${index + 1}_${timestamp}_${randomHex}.${ext}`;
    const filePath = `catalog/${fileName}`;

    console.log(`[Photo ${index + 1}] Uploading ${bytes.length} bytes to product-images bucket...`);
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error(`[Photo ${index + 1}] Upload error:`, uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`[Photo ${index + 1}] ✅ VERIFIED CLEAN URL: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`[Photo ${index + 1}] Error:`, err);
    return null;
  }
}

async function run() {
  console.log('=== Verifying and Uploading 5 Real High-Res Photos for Mini Balança Digital ===\n');

  const verifiedUrls = [];
  for (let i = 0; i < VALID_ML_IMAGES.length; i++) {
    const cleanUrl = await verifyAndUpload(VALID_ML_IMAGES[i], i);
    if (cleanUrl) verifiedUrls.push(cleanUrl);
  }

  if (verifiedUrls.length === 0) {
    console.error('No images verified.');
    return;
  }

  const mainImage = verifiedUrls[0];
  const gallerySqlArray = `ARRAY[${verifiedUrls.map(u => `'${u}'`).join(', ')}]::text[]`;

  const sql = `UPDATE products SET main_image_url = '${mainImage}', image_url = '${mainImage}', images = ${gallerySqlArray} WHERE id = '${PRODUCT_ID}';`;

  console.log('\n================ EXECUTING SQL UPDATE ================');
  console.log(sql);
  console.log('======================================================\n');
}

run();
