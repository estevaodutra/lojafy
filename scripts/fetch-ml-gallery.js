import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PRODUCT_ID = 'c035d8b4-cac3-4aa1-ae29-54e494c39f17';
const QUERY = 'Mini Balanca Digital 500g';

async function sanitizeSingleImage(imageUrl) {
  if (!imageUrl) return null;
  try {
    console.log(`Downloading ML photo: ${imageUrl}`);
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!res.ok) {
      console.warn(`Failed to download ${imageUrl}: ${res.status}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await res.arrayBuffer());

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `gallery_${timestamp}_${randomHex}.${ext}`;
    const filePath = `catalog/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error(`Upload error:`, uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`✅ Uploaded clean photo: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`Error:`, err);
    return null;
  }
}

async function run() {
  console.log(`Fetching full item details from Mercado Livre for: "${QUERY}"...`);
  
  const searchUrl = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(QUERY)}&limit=1`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  if (!searchData.results || searchData.results.length === 0) {
    console.error('Item not found on Mercado Livre search.');
    return;
  }

  const itemId = searchData.results[0].id;
  console.log(`Found ML Item ID: ${itemId}`);

  const itemRes = await fetch(`https://api.mercadolibre.com/items/${itemId}`);
  const itemData = await itemRes.json();

  const originalPictures = (itemData.pictures || []).map(p => p.secure_url || p.url);
  console.log(`Found ${originalPictures.length} pictures in original ML gallery:`, originalPictures);

  const cleanGallery = [];
  for (const picUrl of originalPictures) {
    const cleanUrl = await sanitizeSingleImage(picUrl);
    if (cleanUrl) cleanGallery.push(cleanUrl);
  }

  if (cleanGallery.length === 0) {
    console.error('No images clean.');
    return;
  }

  const mainImage = cleanGallery[0];
  const gallerySqlArray = `ARRAY[${cleanGallery.map(u => `'${u}'`).join(', ')}]::text[]`;

  const sql = `UPDATE products SET main_image_url = '${mainImage}', image_url = '${mainImage}', images = ${gallerySqlArray} WHERE id = '${PRODUCT_ID}';`;

  console.log('\n================ EXECUTING SQL UPDATE ================');
  console.log(sql);
  console.log('======================================================\n');
}

run();
