-- =============================================================================
-- Módulo Fornecedor P1 — Estoque real com ledger
--
-- products.stock_quantity continua sendo o estoque físico (storefront,
-- triggers de notificação, admin e ML seguem funcionando). O ledger
-- insert-only registra cada mudança; a reserva é DERIVADA (soma de itens de
-- fulfillment em status pré-envio) — sem contador armazenado, sem drift.
-- Débito físico acontece na transição para 'shipped'.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_inventory_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.supplier_organizations(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.supplier_locations(id) ON DELETE SET NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'entry', 'exit', 'adjustment', 'reservation', 'reservation_release',
    'sale_deduction', 'return_entry', 'import_load', 'correction'
  )),
  quantity INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL,
  new_quantity INTEGER NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  reason TEXT,
  performed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_created
  ON public.supplier_inventory_movements(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product
  ON public.supplier_inventory_movements(product_id, created_at DESC);
REVOKE UPDATE, DELETE ON public.supplier_inventory_movements FROM anon, authenticated;

ALTER TABLE public.supplier_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own inventory movements"
  ON public.supplier_inventory_movements FOR SELECT
  TO authenticated
  USING (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Service role manages inventory movements"
  ON public.supplier_inventory_movements FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =============================================================================
-- Único caminho de escrita de estoque do fornecedor
-- =============================================================================

CREATE OR REPLACE FUNCTION public.apply_inventory_movement(
  p_product_id UUID,
  p_movement_type TEXT,
  p_quantity INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_variant_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_previous INTEGER;
  v_new INTEGER;
  v_delta INTEGER;
  v_movement_id UUID;
  v_informational BOOLEAN;
BEGIN
  IF p_quantity IS NULL OR p_quantity = 0 THEN
    RETURN json_build_object('success', false, 'error', 'Quantidade deve ser diferente de zero');
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;

  IF NOT (
    v_product.supplier_id = auth.uid()
    OR public.is_supplier_org_member(v_product.supplier_organization_id, auth.uid())
    OR public.is_admin_user()
    OR auth.uid() IS NULL
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão para este produto');
  END IF;

  -- reservas são informacionais: não alteram o estoque físico
  v_informational := p_movement_type IN ('reservation', 'reservation_release');

  IF p_variant_id IS NOT NULL THEN
    SELECT * INTO v_variant FROM public.product_variants WHERE id = p_variant_id FOR UPDATE;
    IF NOT FOUND THEN
      RETURN json_build_object('success', false, 'error', 'Variante não encontrada');
    END IF;
    v_previous := COALESCE(v_variant.stock_quantity, 0);
  ELSE
    v_previous := COALESCE(v_product.stock_quantity, 0);
  END IF;

  v_delta := CASE
    WHEN p_movement_type IN ('entry', 'return_entry', 'import_load') THEN abs(p_quantity)
    WHEN p_movement_type IN ('exit', 'sale_deduction') THEN -abs(p_quantity)
    WHEN p_movement_type IN ('adjustment', 'correction') THEN p_quantity
    ELSE 0
  END;

  v_new := v_previous + v_delta;
  IF v_new < 0 THEN
    IF p_movement_type = 'sale_deduction' THEN
      -- envio nunca é bloqueado por contabilidade de estoque: debita o que existe
      v_new := 0;
    ELSE
      RETURN json_build_object('success', false, 'error',
        format('Estoque insuficiente: atual %s, movimento %s', v_previous, v_delta));
    END IF;
  END IF;

  IF NOT v_informational THEN
    IF p_variant_id IS NOT NULL THEN
      UPDATE public.product_variants SET stock_quantity = v_new WHERE id = p_variant_id;
    ELSE
      UPDATE public.products SET stock_quantity = v_new, sku_locked = true WHERE id = p_product_id;
    END IF;
  ELSE
    v_new := v_previous;
  END IF;

  INSERT INTO public.supplier_inventory_movements (
    organization_id, location_id, product_id, variant_id, movement_type,
    quantity, previous_quantity, new_quantity, reference_type, reference_id,
    reason, performed_by
  ) VALUES (
    v_product.supplier_organization_id, p_location_id, p_product_id, p_variant_id, p_movement_type,
    p_quantity, v_previous, v_new, p_reference_type, p_reference_id,
    p_reason, auth.uid()
  ) RETURNING id INTO v_movement_id;

  RETURN json_build_object('success', true, 'movement_id', v_movement_id, 'new_quantity', v_new);
END;
$$;

-- =============================================================================
-- Visão de estoque: físico, reservado (derivado) e disponível
-- =============================================================================

CREATE OR REPLACE VIEW public.supplier_stock_overview AS
SELECT
  p.id AS product_id,
  p.supplier_organization_id AS organization_id,
  p.name,
  p.sku,
  p.main_image_url,
  p.min_stock_level,
  COALESCE(p.stock_quantity, 0) AS stock_quantity,
  COALESCE(r.reserved, 0)::integer AS reserved_quantity,
  (COALESCE(p.stock_quantity, 0) - COALESCE(r.reserved, 0))::integer AS available_quantity,
  (COALESCE(p.stock_quantity, 0) - COALESCE(r.reserved, 0)) <= COALESCE(p.min_stock_level, 5) AS is_below_minimum
FROM public.products p
LEFT JOIN (
  SELECT fi.product_id, sum(fi.quantity) AS reserved
  FROM public.supplier_fulfillment_items fi
  JOIN public.supplier_fulfillments f ON f.id = fi.fulfillment_id
  WHERE f.status IN ('awaiting_picking', 'picking', 'picked', 'packing', 'packed', 'label_ready')
  GROUP BY fi.product_id
) r ON r.product_id = p.id
WHERE p.supplier_organization_id IS NOT NULL;

GRANT SELECT ON public.supplier_stock_overview TO authenticated;

-- =============================================================================
-- Integração com fulfillments:
--  - criação → linha informacional 'reservation'
--  - shipped → débito físico 'sale_deduction'
--  - cancelamento pré-envio → 'reservation_release'
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_fulfillment_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  IF NEW.status = 'shipped' AND OLD.status IS DISTINCT FROM 'shipped' THEN
    FOR v_item IN (
      SELECT product_id, quantity FROM public.supplier_fulfillment_items
      WHERE fulfillment_id = NEW.id AND product_id IS NOT NULL
    ) LOOP
      PERFORM public.apply_inventory_movement(
        v_item.product_id, 'sale_deduction', v_item.quantity,
        'Envio do pedido', NULL, NULL, 'supplier_fulfillment', NEW.id
      );
    END LOOP;
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled'
        AND OLD.status IN ('awaiting_picking', 'picking', 'picked', 'packing', 'packed', 'label_ready', 'occurrence') THEN
    FOR v_item IN (
      SELECT product_id, quantity FROM public.supplier_fulfillment_items
      WHERE fulfillment_id = NEW.id AND product_id IS NOT NULL
    ) LOOP
      PERFORM public.apply_inventory_movement(
        v_item.product_id, 'reservation_release', v_item.quantity,
        'Cancelamento do fulfillment', NULL, NULL, 'supplier_fulfillment', NEW.id
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_fulfillment_inventory_trigger ON public.supplier_fulfillments;
CREATE TRIGGER handle_fulfillment_inventory_trigger
  AFTER UPDATE ON public.supplier_fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_fulfillment_inventory();

CREATE OR REPLACE FUNCTION public.handle_fulfillment_item_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.product_id IS NOT NULL THEN
    PERFORM public.apply_inventory_movement(
      NEW.product_id, 'reservation', NEW.quantity,
      'Reserva por novo pedido', NULL, NULL, 'supplier_fulfillment', NEW.fulfillment_id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_fulfillment_item_reservation_trigger ON public.supplier_fulfillment_items;
CREATE TRIGGER handle_fulfillment_item_reservation_trigger
  AFTER INSERT ON public.supplier_fulfillment_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_fulfillment_item_reservation();
