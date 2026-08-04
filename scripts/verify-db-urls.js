import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lojafy-supabase.d2x.site';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PRODUCT_ID = 'c035d8b4-cac3-4aa1-ae29-54e494c39f17';

async function verify() {
  const { data: prod } = await supabase.from('products').select('name, main_image_url, images').eq('id', PRODUCT_ID).single();
  console.log(`Product: ${prod.name}`);
  console.log(`Total images in database array: ${prod.images.length}`);
  
  for (let i = 0; i < prod.images.length; i++) {
    const url = prod.images[i];
    const res = await fetch(url);
    const bytes = new Uint8Array(await res.arrayBuffer());
    const isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    console.log(`Photo ${i+1}: status=${res.status}, size=${bytes.length} bytes, contentType=${res.headers.get('content-type')}, magic=[${bytes[0]},${bytes[1]},${bytes[2]}], validJPEG=${isJpeg}`);
  }
}

verify();
