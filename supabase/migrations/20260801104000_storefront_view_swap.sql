-- =============================================================================
-- Módulo Fornecedor — Etapa final da correção do vazamento de cost_price
--
-- Pré-requisito: o frontend da loja/customer já lê de store_products /
-- store_product_variants (Fase 5). Esta migration troca as policies de
-- SELECT das tabelas base: anon e customers deixam de ler products e
-- product_variants diretamente (e portanto deixam de enxergar cost_price
-- e supplier_id); admin/fornecedor/revendedor/service_role continuam.
-- =============================================================================

-- store_products ganha high_rotation (usada pelo checkout) — coluna nova ao final
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
  AND (p.supplier_id IS NULL OR p.approval_status = 'approved')
  AND (p.stage IS NULL OR p.stage = 'stage_2_enabled');

-- Variantes públicas sem cost_price, só de produtos visíveis na loja
CREATE OR REPLACE VIEW public.store_product_variants AS
SELECT
  v.id,
  v.product_id,
  v.type,
  v.name,
  v.value,
  v.price_modifier,
  v.stock_quantity,
  v.image_url,
  v.active,
  v.created_at,
  v.updated_at
FROM public.product_variants v
WHERE v.active = true
  AND EXISTS (SELECT 1 FROM public.store_products sp WHERE sp.id = v.product_id);

GRANT SELECT ON public.store_products TO anon, authenticated;
GRANT SELECT ON public.store_product_variants TO anon, authenticated;

-- Papel de revendedor (equivalente definer de is_admin_user)
CREATE OR REPLACE FUNCTION public.is_reseller_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'reseller'
  );
$$;

-- Troca da policy de products
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;
CREATE POLICY "Staff and partners can view products"
  ON public.products FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR supplier_id = auth.uid()
    OR public.is_supplier_org_member(supplier_organization_id, auth.uid())
    OR public.is_reseller_user()
  );
CREATE POLICY "Service role can view products"
  ON public.products FOR SELECT
  TO service_role
  USING (true);

-- Troca da policy de product_variants (também tem cost_price)
DROP POLICY IF EXISTS "Anyone can view active product variants" ON public.product_variants;
CREATE POLICY "Staff and partners can view product variants"
  ON public.product_variants FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR public.is_reseller_user()
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id
        AND (p.supplier_id = auth.uid()
             OR public.is_supplier_org_member(p.supplier_organization_id, auth.uid()))
    )
  );
CREATE POLICY "Service role can view product variants"
  ON public.product_variants FOR SELECT
  TO service_role
  USING (true);
