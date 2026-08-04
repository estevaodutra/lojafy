import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TARGET_PRODUCTS = [
  {
    id: 'd2f3f13a-9703-4c75-92e0-2ab95fe813e4',
    name: 'Adesivo Calmante para Picadas de Mosquito Bebê com Lavanda',
    url: 'https://http2.mlstatic.com/D_NQ_NP_728557-MLA99579403320_122025-F.jpg'
  },
  {
    id: 'c035d8b4-cac3-4aa1-ae29-54e494c39f17',
    name: 'Mini Balança Digital De Alta Precisão Portátil 0,01g A 500g',
    url: 'https://http2.mlstatic.com/D_NQ_NP_731342-MLA100115091481_122025-F.jpg'
  },
  {
    id: '23182dc7-1955-4955-9d43-7d51c835678a',
    name: 'Amoveri Babydeas Amo Protect Desenho Sapinho 8 Unidades',
    url: 'https://http2.mlstatic.com/D_NQ_NP_983564-MLA105470512830_012026-F.jpg'
  }
];

async function processProduct(prod) {
  console.log(`Processing: ${prod.name}...`);
  try {
    const res = await fetch(prod.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    if (!res.ok) {
      console.error(`Failed to download ${prod.url}: ${res.status}`);
      return null;
    }

    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const bytes = new Uint8Array(await res.arrayBuffer());

    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 10);
    const fileName = `clean_ml_${timestamp}_${randomHex}.${ext}`;
    const filePath = `catalog/${fileName}`;

    console.log(`Uploading ${fileName} to product-images bucket...`);
    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(filePath, bytes, { contentType, upsert: true });

    if (uploadError) {
      console.error(`Upload error for ${prod.name}:`, uploadError);
      return null;
    }

    const { data: publicData } = supabase.storage.from('product-images').getPublicUrl(filePath);
    const cleanUrl = publicData.publicUrl;
    console.log(`✅ Uploaded to: ${cleanUrl}`);
    return cleanUrl;
  } catch (err) {
    console.error(`Error processing ${prod.name}:`, err);
    return null;
  }
}

async function run() {
  const sqlStatements = [];
  for (const prod of TARGET_PRODUCTS) {
    const cleanUrl = await processProduct(prod);
    if (cleanUrl) {
      const sql = `UPDATE products SET main_image_url = '${cleanUrl}', image_url = '${cleanUrl}', images = ARRAY['${cleanUrl}']::text[] WHERE id = '${prod.id}';`;
      sqlStatements.push(sql);
    }
  }

  console.log('\n================ SQL STATEMENTS TO EXECUTE ================');
  console.log(sqlStatements.join('\n'));
  console.log('===========================================================\n');
}

run();
