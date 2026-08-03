-- Redefinir a view public.store_products para remover o filtro de estágio,
-- permitindo que qualquer produto ativo (active = true) seja exibido na loja.
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
