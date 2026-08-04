import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PRODUCT_ID = 'c035d8b4-cac3-4aa1-ae29-54e494c39f17';

// 5 URLs de imagens REAIS da galeria da Mini Balança Digital
const ML_HD_PICTURES = [
  'https://http2.mlstatic.com/D_NQ_NP_2X_731342-MLA100115091481_122025-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_669708-MLB46684725055_072021-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_892701-MLB46684725056_072021-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_973166-MLB46684725057_072021-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_706596-MLB46684725058_072021-F.jpg'
];

async function downloadAndSanitizeJpeg(url, index) {
  console.log(`[Photo ${index + 1}] Downloading from ML: ${url}`);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Referer': 'https://www.mercadolivre.com.br/',
      }
    });

    if (!res.ok) {
      console.error(`[Photo ${index + 1}] Fetch failed with status ${res.status}`);
      return null;
    }

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verificar Magic Bytes (0xFF 0xD8 0xFF indica arquivo JPEG legítimo)
    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E;
    
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (isPng) {
      mimeType = 'image/png';
      ext = 'png';
    } else if (!isJpeg) {
      console.warn(`[Photo ${index + 1}] Warning: Magic bytes not standard JPEG/PNG (${bytes[0]}, ${bytes[1]}). Forcing clean JPEG headers...`);
    }

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `clean_jpeg_${index + 1}_${timestamp}_${randomHex}.${ext}`;
    const filePath = `catalog/${fileName}`;

    console.log(`[Photo ${index + 1}] Uploading ${bytes.length} bytes as ${mimeType} to product-images...`);

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error(`[Photo ${index + 1}] Upload error:`, uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`[Photo ${index + 1}] ✅ SUCCESS: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`[Photo ${index + 1}] Error:`, err);
    return null;
  }
}

async function run() {
  console.log('=== Sanitizing & Re-encoding 5 Clean JPEG Photos ===\n');

  const cleanUrls = [];
  for (let i = 0; i < ML_HD_PICTURES.length; i++) {
    const cleanUrl = await downloadAndSanitizeJpeg(ML_HD_PICTURES[i], i);
    if (cleanUrl) cleanUrls.push(cleanUrl);
  }

  if (cleanUrls.length === 0) {
    console.error('No clean URLs generated.');
    return;
  }

  const mainImage = cleanUrls[0];
  const galleryArraySql = `ARRAY[${cleanUrls.map(u => `'${u}'`).join(', ')}]::text[]`;

  const sql = `UPDATE products SET main_image_url = '${mainImage}', image_url = '${mainImage}', images = ${galleryArraySql} WHERE id = '${PRODUCT_ID}';`;

  console.log('\n================ SQL UPDATE ================');
  console.log(sql);
  console.log('============================================\n');

  // Atualizar diretamente no Supabase se possível
  const { error: dbError } = await supabase
    .from('products')
    .update({
      main_image_url: mainImage,
      image_url: mainImage,
      images: cleanUrls,
    })
    .eq('id', PRODUCT_ID);

  if (!dbError) {
    console.log('✅ DATABASE UPDATED DIRECTLY VIA SUPABASE CLIENT!');
  } else {
    console.log('ℹ️ Execute the SQL statement above in SQL Editor if client update requires admin auth.');
  }
}

run();
