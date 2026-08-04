import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function sanitizeAndRehostImage(imageUrl) {
  if (!imageUrl) return imageUrl;
  // Se a URL já estiver no nosso bucket product-images, ignorar
  if (imageUrl.includes(SUPABASE_URL) && imageUrl.includes('product-images')) {
    return imageUrl;
  }

  try {
    console.log(`Downloading external image: ${imageUrl}`);
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      console.warn(`Failed to download ${imageUrl}: ${response.status}`);
      return imageUrl;
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `migrated_${timestamp}_${randomHex}.${ext}`;
    const filePath = `catalog/${fileName}`;

    console.log(`Uploading to product-images bucket: ${filePath}`);
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return imageUrl;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`Successfully migrated -> ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`Error processing ${imageUrl}:`, err);
    return imageUrl;
  }
}

async function runMigration() {
  console.log('=== Starting Image Migration to product-images Bucket ===');
  
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, main_image_url, image_url, images');

  if (error) {
    console.error('Error fetching products:', error);
    return;
  }

  console.log(`Found ${products?.length || 0} products in database.`);

  let updatedCount = 0;

  for (const product of (products || [])) {
    console.log(`Processing product: ${product.name} (ID: ${product.id})`);
    let needsUpdate = false;
    let newMainImage = product.main_image_url;
    let newImageUrl = product.image_url;
    let newImages = Array.isArray(product.images) ? [...product.images] : [];

    if (product.main_image_url && (!product.main_image_url.includes(SUPABASE_URL) || product.main_image_url.includes('mlstatic.com'))) {
      newMainImage = await sanitizeAndRehostImage(product.main_image_url);
      if (newMainImage !== product.main_image_url) needsUpdate = true;
    }

    if (product.image_url && (!product.image_url.includes(SUPABASE_URL) || product.image_url.includes('mlstatic.com'))) {
      newImageUrl = await sanitizeAndRehostImage(product.image_url);
      if (newImageUrl !== product.image_url) needsUpdate = true;
    }

    if (Array.isArray(product.images) && product.images.length > 0) {
      const sanitizedList = [];
      for (const img of product.images) {
        const u = typeof img === 'string' ? img : img?.url ?? img?.src ?? null;
        if (u) {
          const cleanUrl = await sanitizeAndRehostImage(u);
          sanitizedList.push(cleanUrl);
          if (cleanUrl !== u) needsUpdate = true;
        }
      }
      newImages = sanitizedList;
    }

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
        updatedCount++;
        console.log(`✅ Product "${product.name}" updated successfully!`);
      } else {
        console.error(`❌ Failed to update product "${product.name}":`, updateErr);
      }
    } else {
      console.log(`ℹ️ Product "${product.name}" already clean.`);
    }
  }

  console.log(`=== Migration Finished: ${updatedCount} products updated! ===`);
}

runMigration();
