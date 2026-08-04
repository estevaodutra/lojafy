const urls = [
  'https://lojafy-supabase.d2x.site/storage/v1/object/public/product-images/catalog/clean_jpeg_1_1785809907354_m3z9h49n.jpg',
  'https://lojafy-supabase.d2x.site/storage/v1/object/public/product-images/catalog/clean_jpeg_2_1785809907618_9oq5q9cp.jpg',
  'https://lojafy-supabase.d2x.site/storage/v1/object/public/product-images/catalog/clean_jpeg_3_1785809907834_6nt38ngm.jpg',
  'https://lojafy-supabase.d2x.site/storage/v1/object/public/product-images/catalog/clean_jpeg_4_1785809908055_o4dih7nj.jpg',
  'https://lojafy-supabase.d2x.site/storage/v1/object/public/product-images/catalog/clean_jpeg_5_1785809908267_98eb7gpr.jpg'
];

async function check() {
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i]);
    const bytes = new Uint8Array(await res.arrayBuffer());
    console.log(`URL ${i+1}: status=${res.status}, size=${bytes.length}, contentType=${res.headers.get('content-type')}, magic=${bytes[0]},${bytes[1]},${bytes[2]}`);
  }
}

check();
