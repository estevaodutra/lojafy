-- =============================================================================
-- Módulo Fornecedor P0 — Hardening de RLS
-- Corrige as falhas confirmadas na auditoria:
--   2. UPDATE de products por supplier sem WITH CHECK (reatribuição de supplier_id)
--   3. INSERT de products por supplier sem restrição de approval_status
--   4. product_approval_history com INSERT WITH CHECK (true)
--   5. order_payment_splits com FOR ALL USING (true) sem TO service_role
--   1 (etapa 1). View store_products sem colunas de custo/fornecedor.
--      A troca da policy de SELECT da tabela base fica para a migration
--      20260801104000, depois que o frontend da loja migrar para a view.
-- =============================================================================

-- Falha 2: UPDATE com WITH CHECK
DROP POLICY IF EXISTS "Suppliers can update their own products" ON public.products;
CREATE POLICY "Suppliers can update their own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (supplier_id = auth.uid())
  WITH CHECK (supplier_id = auth.uid());

-- Falha 3: INSERT restrito a draft/pending_approval
DROP POLICY IF EXISTS "Suppliers can insert their own products" ON public.products;
CREATE POLICY "Suppliers can insert their own products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (
    supplier_id = auth.uid()
    AND approval_status IN ('draft', 'pending_approval')
  );

-- Guardas OLD/NEW que RLS não expressa: supplier não-admin não pode
-- aprovar/rejeitar o próprio produto, ativar produto não aprovado,
-- nem trocar supplier_id.
CREATE OR REPLACE FUNCTION public.enforce_supplier_product_guards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role e admins podem tudo
  IF auth.uid() IS NULL OR public.is_admin_user() THEN
    RETURN NEW;
  END IF;

  IF OLD.supplier_id = auth.uid() THEN
    IF NEW.supplier_id IS DISTINCT FROM OLD.supplier_id THEN
      RAISE EXCEPTION 'Fornecedor não pode transferir a titularidade do produto';
    END IF;

    IF NEW.approval_status IS DISTINCT FROM OLD.approval_status
       AND NEW.approval_status NOT IN ('draft', 'pending_approval') THEN
      RAISE EXCEPTION 'Fornecedor não pode aprovar ou rejeitar o próprio produto';
    END IF;

    IF NEW.active AND NOT COALESCE(OLD.active, false)
       AND NEW.approval_status IS DISTINCT FROM 'approved' THEN
      RAISE EXCEPTION 'Produto não aprovado não pode ser ativado';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_supplier_product_guards_trigger ON public.products;
CREATE TRIGGER enforce_supplier_product_guards_trigger
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_supplier_product_guards();

-- Falha 4: histórico de aprovação só por admin/service_role
DROP POLICY IF EXISTS "System can insert approval history" ON public.product_approval_history;
CREATE POLICY "Admins can insert approval history"
  ON public.product_approval_history FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());
CREATE POLICY "Service role can insert approval history"
  ON public.product_approval_history FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Falha 5: splits gerenciados só por service_role; admin ALL; SELECT próprio já existe
DROP POLICY IF EXISTS "Service role can manage splits" ON public.order_payment_splits;
CREATE POLICY "Service role can manage splits"
  ON public.order_payment_splits FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Admins can manage splits"
  ON public.order_payment_splits FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- =============================================================================
-- Falha 1 (etapa 1): view segura para a loja, sem custo/fornecedor.
-- security_invoker=false (definer) + grant: anon/customers leem produtos
-- habilitados sem enxergar cost_price. Produtos de fornecedor só aparecem
-- aprovados; produtos de admin (supplier_id IS NULL) seguem a regra atual
-- (active), pois nunca passaram pelo fluxo de aprovação.
-- A migration 20260801102000 recria esta view acrescentando o filtro de stage.
-- =============================================================================

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
  p.permalink,
  p.created_at,
  p.updated_at
FROM public.products p
WHERE p.active = true
  AND (p.supplier_id IS NULL OR p.approval_status = 'approved');

GRANT SELECT ON public.store_products TO anon, authenticated;

-- =============================================================================
-- Auditoria de mudanças sensíveis em products
-- =============================================================================

CREATE OR REPLACE FUNCTION public.audit_product_sensitive_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.price IS DISTINCT FROM OLD.price
     OR NEW.cost_price IS DISTINCT FROM OLD.cost_price
     OR NEW.sku IS DISTINCT FROM OLD.sku
     OR NEW.approval_status IS DISTINCT FROM OLD.approval_status
     OR NEW.active IS DISTINCT FROM OLD.active THEN
    PERFORM public.log_supplier_audit(
      NEW.supplier_organization_id,
      'product_sensitive_change',
      'product',
      NEW.id,
      jsonb_build_object(
        'price', OLD.price, 'cost_price', OLD.cost_price, 'sku', OLD.sku,
        'approval_status', OLD.approval_status, 'active', OLD.active
      ),
      jsonb_build_object(
        'price', NEW.price, 'cost_price', NEW.cost_price, 'sku', NEW.sku,
        'approval_status', NEW.approval_status, 'active', NEW.active
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_product_sensitive_changes_trigger ON public.products;
CREATE TRIGGER audit_product_sensitive_changes_trigger
  AFTER UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_product_sensitive_changes();
