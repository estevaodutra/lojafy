import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PRODUCT_ID = 'c035d8b4-cac3-4aa1-ae29-54e494c39f17';

// Candidatos a imagens de alta resolução da Mini Balança Digital
const CANDIDATE_IMAGE_URLS = [
  'https://http2.mlstatic.com/D_NQ_NP_2X_731342-MLA100115091481_122025-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_910078-MLB74581561571_022024-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_912235-MLB54944208461_042023-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_730626-MLB74581561621_022024-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_738622-MLB52668581702_122022-F.jpg',
  'https://http2.mlstatic.com/D_NQ_NP_2X_894676-MLB70243407981_062023-F.jpg',
  'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=800&auto=format&fit=crop&q=80'
];

async function downloadAndVerifyJpeg(url, index) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      }
    });

    if (!res.ok) return null;

    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Verificar se é um JPEG autêntico (0xFF 0xD8 0xFF -> 255, 216, 255)
    const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    const isPng = bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78;

    if (!isJpeg && !isPng) {
      console.warn(`[Candidate ${index+1}] Rejected ${url} (Magic bytes: ${bytes[0]},${bytes[1]},${bytes[2]} - Not JPEG/PNG)`);
      return null;
    }

    const ext = isPng ? 'png' : 'jpg';
    const mimeType = isPng ? 'image/png' : 'image/jpeg';
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `verified_photo_${index + 1}_${timestamp}_${randomHex}.${ext}`;
    const filePath = `catalog/${fileName}`;

    console.log(`[Candidate ${index+1}] Valid ${mimeType} (${bytes.length} bytes)! Uploading to product-images...`);

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error(`Upload error:`, uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    console.log(`✅ VERIFIED PUBLIC URL: ${publicData.publicUrl}`);
    return publicData.publicUrl;
  } catch (err) {
    console.error(`Error:`, err);
    return null;
  }
}

async function run() {
  console.log('=== Finding and Uploading 5 Guaranteed Authentic JPEGs ===\n');

  const verifiedUrls = [];
  for (let i = 0; i < CANDIDATE_IMAGE_URLS.length; i++) {
    if (verifiedUrls.length >= 5) break;
    const cleanUrl = await downloadAndVerifyJpeg(CANDIDATE_IMAGE_URLS[i], i);
    if (cleanUrl) verifiedUrls.push(cleanUrl);
  }

  console.log(`\nSuccessfully verified and uploaded ${verifiedUrls.length} authentic JPEG photos!`);

  if (verifiedUrls.length > 0) {
    const mainImage = verifiedUrls[0];
    const { error: dbError } = await supabase
      .from('products')
      .update({
        main_image_url: mainImage,
        image_url: mainImage,
        images: verifiedUrls,
      })
      .eq('id', PRODUCT_ID);

    if (!dbError) {
      console.log('✅ DATABASE UPDATED SUCCESSFULLY WITH VERIFIED JPEGs!');
    } else {
      console.error('Database update error:', dbError);
    }
  }
}

run();
