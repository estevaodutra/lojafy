import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sanitizeSingleImage(imageUrl) {
  if (!imageUrl) return imageUrl;
  if (imageUrl.includes(SUPABASE_URL) && imageUrl.includes('product-images') && !imageUrl.includes('mlstatic.com')) {
    return imageUrl;
  }

  try {
    console.log(`  -> Downloading image: ${imageUrl}`);
    const res = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!res.ok) {
      console.warn(`  ❌ Failed to download ${imageUrl}: status ${res.status}`);
      return imageUrl;
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

    console.log(`  -> Uploading clean image: ${filePath}`);
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error(`  ❌ Storage upload error:`, uploadError);
      return imageUrl;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`  ✅ Clean URL: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`  ❌ Error processing image ${imageUrl}:`, err);
    return imageUrl;
  }
}

async function run() {
  console.log('=== Starting Full Gallery Migration for Products ===\n');

  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, main_image_url, image_url, images, original_images')
    .eq('active', true);

  if (error || !products) {
    console.error('Failed to fetch products:', error);
    return;
  }

  console.log(`Found ${products.length} active products.`);

  const sqlStatements = [];

  for (const prod of products) {
    console.log(`\n[Product] ${prod.name} (${prod.id})`);

    // 1. Process Main Image
    const cleanMainImage = await sanitizeSingleImage(prod.main_image_url);
    const cleanImageUrl = await sanitizeSingleImage(prod.image_url);

    // 2. Process Full Images Gallery
    let rawGallery = [];
    if (Array.isArray(prod.images) && prod.images.length > 0) {
      rawGallery = prod.images;
    } else if (Array.isArray(prod.original_images) && prod.original_images.length > 0) {
      rawGallery = prod.original_images;
    }

    const cleanGallery = [];
    for (const item of rawGallery) {
      const u = typeof item === 'string' ? item : item?.url ?? item?.src ?? null;
      if (u) {
        const clean = await sanitizeSingleImage(u);
        cleanGallery.push(clean);
      }
    }

    if (cleanMainImage && !cleanGallery.includes(cleanMainImage)) {
      cleanGallery.unshift(cleanMainImage);
    }

    const formattedGallerySql = `ARRAY[${cleanGallery.map(url => `'${url}'`).join(', ')}]::text[]`;
    const sql = `UPDATE products SET main_image_url = '${cleanMainImage}', image_url = '${cleanImageUrl}', images = ${formattedGallerySql} WHERE id = '${prod.id}';`;

    sqlStatements.push(sql);
  }

  console.log('\n================ ALL SQL STATEMENTS TO EXECUTE ================');
  console.log(sqlStatements.join('\n'));
  console.log('===============================================================\n');
}

run();
