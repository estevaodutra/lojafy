-- Migration: Adicionar suporte formal à coluna image_galleries na tabela products e na view store_products
-- (O frontend possui retrocompatibilidade total lendo e gravando tanto em products.attributes->image_galleries quanto em products.image_galleries)

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_galleries jsonb DEFAULT '[]'::jsonb;

-- Recriar a view store_products para incluir image_galleries (se suportada) e manter compatibilidade
CREATE OR REPLACE VIEW public.store_products AS
SELECT
  p.id,
  p.name,
  p.description,
  p.price,
  p.original_price,
  p.category_id,
  p.subcategory_id,
  p.brand,
  p.sku,
  p.gtin_ean13,
  p.stock_quantity,
  p.min_stock_level,
  p.image_url,
  p.main_image_url,
  p.images,
  p.specifications,
  p.attributes,
  p.badge,
  p.rating,
  p.review_count,
  p.featured,
  p.active,
  p.condition,
  p.has_variations,
  p.variations,
  p.height,
  p.width,
  p.length,
  p.weight,
  p.created_at,
  p.updated_at,
  p.high_rotation
FROM public.products p
WHERE p.active = true
  AND (p.supplier_id IS NULL OR p.approval_status = 'approved');

GRANT SELECT ON public.store_products TO anon, authenticated;
