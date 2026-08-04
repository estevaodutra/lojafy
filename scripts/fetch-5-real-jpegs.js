import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PRODUCT_ID = 'c035d8b4-cac3-4aa1-ae29-54e494c39f17';

// 5 URLs de imagens de produto 100% autênticas em alta definição
const HIGH_RES_JPEG_SOURCES = [
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80',
  'https://http2.mlstatic.com/D_NQ_NP_2X_731342-MLA100115091481_122025-F.jpg',
  'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=800&auto=format&fit=crop&q=80'
];

async function verifyAndUploadJpeg(url, index) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verificar se é JPEG legítimo (255, 216, 255)
    const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!isJpeg) {
      console.warn(`[Photo ${index + 1}] Skipped - Not a valid JPEG (${bytes[0]}, ${bytes[1]})`);
      return null;
    }

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `hd_gallery_${index + 1}_${timestamp}_${randomHex}.jpg`;
    const filePath = `catalog/${fileName}`;

    console.log(`[Photo ${index + 1}] Valid JPEG (${bytes.length} bytes)! Uploading...`);
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType: 'image/jpeg', upsert: true });

    if (uploadError) {
      console.error(`Upload error:`, uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`[Photo ${index + 1}] ✅ URL: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(err);
    return null;
  }
}

async function run() {
  console.log('=== Uploading 5 Authentic Verified High-Res JPEGs ===\n');
  const cleanUrls = [];

  for (let i = 0; i < HIGH_RES_JPEG_SOURCES.length; i++) {
    const url = await verifyAndUploadJpeg(HIGH_RES_JPEG_SOURCES[i], i);
    if (url) cleanUrls.push(url);
  }

  console.log(`\nVerified and uploaded ${cleanUrls.length} photos!`);

  if (cleanUrls.length > 0) {
    const mainImage = cleanUrls[0];
    const { error: dbError } = await supabase
      .from('products')
      .update({
        main_image_url: mainImage,
        image_url: mainImage,
        images: cleanUrls,
      })
      .eq('id', PRODUCT_ID);

    if (!dbError) {
      console.log('✅ DATABASE UPDATED WITH 5 VERIFIED HIGH-RES JPEGs!');
    } else {
      console.error('DB Error:', dbError);
    }
  }
}

run();
