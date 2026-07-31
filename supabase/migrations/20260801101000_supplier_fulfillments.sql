-- =============================================================================
-- Módulo Fornecedor P0 — Fulfillment por fornecedor
-- Um pedido pago gera 1 fulfillment por organização de fornecedor envolvida.
-- Criação 100% via trigger no banco: cobre PIX (webhook-n8n-payment),
-- wallet (complete-wallet-payment) e ML (ml-order-webhook) sem tocar em
-- nenhuma edge function.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_fulfillments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  supplier_organization_id UUID NOT NULL REFERENCES public.supplier_organizations(id),
  supplier_user_id UUID,
  status TEXT NOT NULL DEFAULT 'awaiting_picking' CHECK (status IN (
    'awaiting_picking', 'picking', 'picked', 'packing', 'packed',
    'label_ready', 'shipped', 'in_transit', 'delivered',
    'occurrence', 'cancelled', 'returned'
  )),
  sla_picking_deadline TIMESTAMPTZ,
  sla_shipping_deadline TIMESTAMPTZ,
  label_status TEXT NOT NULL DEFAULT 'none' CHECK (label_status IN (
    'none', 'pending', 'generated', 'printed', 'error'
  )),
  carrier TEXT,
  tracking_code TEXT,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, supplier_organization_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_fulfillments_org_status
  ON public.supplier_fulfillments(supplier_organization_id, status);
CREATE INDEX IF NOT EXISTS idx_supplier_fulfillments_org_sla
  ON public.supplier_fulfillments(supplier_organization_id, sla_picking_deadline);
CREATE INDEX IF NOT EXISTS idx_supplier_fulfillments_order
  ON public.supplier_fulfillments(order_id);

CREATE TABLE IF NOT EXISTS public.supplier_fulfillment_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fulfillment_id UUID NOT NULL REFERENCES public.supplier_fulfillments(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL UNIQUE REFERENCES public.order_items(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_fulfillment_items_fulfillment
  ON public.supplier_fulfillment_items(fulfillment_id);
CREATE INDEX IF NOT EXISTS idx_supplier_fulfillment_items_product
  ON public.supplier_fulfillment_items(product_id);

CREATE TABLE IF NOT EXISTS public.supplier_fulfillment_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fulfillment_id UUID NOT NULL REFERENCES public.supplier_fulfillments(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fulfillment_status_history_fulfillment
  ON public.supplier_fulfillment_status_history(fulfillment_id, created_at DESC);
REVOKE UPDATE, DELETE ON public.supplier_fulfillment_status_history FROM anon, authenticated;

CREATE TRIGGER update_supplier_fulfillments_updated_at BEFORE UPDATE ON public.supplier_fulfillments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Criação idempotente de fulfillments para um pedido pago
-- =============================================================================

CREATE OR REPLACE FUNCTION public.create_fulfillments_for_order(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
  v_fulfillment_id UUID;
  v_picking_hours INTEGER;
  v_shipping_hours INTEGER;
  v_created INTEGER := 0;
BEGIN
  FOR v_group IN (
    SELECT
      COALESCE(p.supplier_organization_id, public.get_supplier_org_id(p.supplier_id)) AS org_id,
      p.supplier_id
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = p_order_id
      AND COALESCE(p.supplier_organization_id, public.get_supplier_org_id(p.supplier_id)) IS NOT NULL
    GROUP BY 1, 2
  ) LOOP
    v_fulfillment_id := NULL;

    SELECT COALESCE(s.picking_sla_hours, 24), COALESCE(s.shipping_sla_hours, 48)
    INTO v_picking_hours, v_shipping_hours
    FROM public.supplier_settings s
    WHERE s.organization_id = v_group.org_id;

    v_picking_hours := COALESCE(v_picking_hours, 24);
    v_shipping_hours := COALESCE(v_shipping_hours, 48);

    INSERT INTO public.supplier_fulfillments (
      order_id, supplier_organization_id, supplier_user_id,
      sla_picking_deadline, sla_shipping_deadline
    ) VALUES (
      p_order_id, v_group.org_id, v_group.supplier_id,
      now() + make_interval(hours => v_picking_hours),
      now() + make_interval(hours => v_shipping_hours)
    )
    ON CONFLICT (order_id, supplier_organization_id) DO NOTHING
    RETURNING id INTO v_fulfillment_id;

    IF v_fulfillment_id IS NOT NULL THEN
      v_created := v_created + 1;

      INSERT INTO public.supplier_fulfillment_items (fulfillment_id, order_item_id, product_id, quantity)
      SELECT v_fulfillment_id, oi.id, oi.product_id, oi.quantity
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = p_order_id
        AND COALESCE(p.supplier_organization_id, public.get_supplier_org_id(p.supplier_id)) = v_group.org_id
      ON CONFLICT (order_item_id) DO NOTHING;

      INSERT INTO public.supplier_fulfillment_status_history (fulfillment_id, from_status, to_status, notes)
      VALUES (v_fulfillment_id, NULL, 'awaiting_picking', 'Fulfillment criado após confirmação de pagamento');
    END IF;
  END LOOP;

  RETURN v_created;
END;
$$;

-- Triggers em orders: pedido já nasce pago (ML) ou transiciona para pago (PIX/wallet)
CREATE OR REPLACE FUNCTION public.handle_order_paid_create_fulfillments()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.payment_status = 'paid' THEN
      PERFORM public.create_fulfillments_for_order(NEW.id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
      PERFORM public.create_fulfillments_for_order(NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_fulfillments_on_order_paid_insert ON public.orders;
CREATE TRIGGER create_fulfillments_on_order_paid_insert
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_paid_create_fulfillments();

DROP TRIGGER IF EXISTS create_fulfillments_on_order_paid_update ON public.orders;
CREATE TRIGGER create_fulfillments_on_order_paid_update
  AFTER UPDATE OF payment_status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_paid_create_fulfillments();

-- =============================================================================
-- Validação de transições + carimbos
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_fulfillment_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allowed TEXT[];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- admin e service_role podem pular etapas
    IF auth.uid() IS NOT NULL AND NOT public.is_admin_user() THEN
      v_allowed := CASE OLD.status
        WHEN 'awaiting_picking' THEN ARRAY['picking', 'occurrence', 'cancelled']
        WHEN 'picking'          THEN ARRAY['picked', 'occurrence', 'cancelled']
        WHEN 'picked'           THEN ARRAY['packing', 'occurrence', 'cancelled']
        WHEN 'packing'          THEN ARRAY['packed', 'occurrence', 'cancelled']
        WHEN 'packed'           THEN ARRAY['label_ready', 'occurrence', 'cancelled']
        WHEN 'label_ready'      THEN ARRAY['shipped', 'occurrence', 'cancelled']
        WHEN 'shipped'          THEN ARRAY['in_transit', 'delivered', 'occurrence']
        WHEN 'in_transit'       THEN ARRAY['delivered', 'occurrence']
        WHEN 'delivered'        THEN ARRAY['returned']
        WHEN 'occurrence'       THEN ARRAY['awaiting_picking', 'picking', 'picked', 'packing', 'packed', 'label_ready', 'cancelled']
        ELSE ARRAY[]::TEXT[]
      END;

      IF NOT (NEW.status = ANY (v_allowed)) THEN
        RAISE EXCEPTION 'Transição de status inválida: % -> %', OLD.status, NEW.status;
      END IF;
    END IF;

    IF NEW.status = 'shipped' THEN
      IF COALESCE(NEW.tracking_code, '') = '' THEN
        RAISE EXCEPTION 'Código de rastreio é obrigatório para marcar como enviado';
      END IF;
      NEW.shipped_at := COALESCE(NEW.shipped_at, now());
    END IF;

    IF NEW.status = 'delivered' THEN
      NEW.delivered_at := COALESCE(NEW.delivered_at, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_fulfillment_transition_trigger ON public.supplier_fulfillments;
CREATE TRIGGER validate_fulfillment_transition_trigger
  BEFORE UPDATE ON public.supplier_fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_fulfillment_transition();

-- =============================================================================
-- Rollup do status do pedido a partir dos fulfillments
-- Só sobrescreve quando o status atual pertence ao vocabulário gerenciado —
-- status manuais/livres do admin nunca são tocados.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.recompute_order_status(p_order_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current TEXT;
  v_new TEXT;
  v_total INTEGER;
  v_cancelled INTEGER;
  v_delivered INTEGER;
  v_min_rank INTEGER;
BEGIN
  SELECT status INTO v_current FROM public.orders WHERE id = p_order_id;

  IF v_current IS NULL
     OR v_current NOT IN ('pago', 'recebido', 'embalado', 'enviado', 'finalizado', 'cancelado') THEN
    RETURN;
  END IF;

  SELECT
    count(*),
    count(*) FILTER (WHERE status = 'cancelled'),
    count(*) FILTER (WHERE status IN ('delivered', 'returned'))
  INTO v_total, v_cancelled, v_delivered
  FROM public.supplier_fulfillments
  WHERE order_id = p_order_id;

  IF v_total = 0 THEN
    RETURN;
  END IF;

  IF v_cancelled = v_total THEN
    v_new := 'cancelado';
  ELSIF v_delivered + v_cancelled = v_total THEN
    v_new := 'finalizado';
  ELSE
    -- status menos avançado entre fulfillments ativos (ocorrências não regridem o pedido)
    SELECT min(CASE status
      WHEN 'awaiting_picking' THEN 1
      WHEN 'picking' THEN 2
      WHEN 'picked' THEN 3
      WHEN 'packing' THEN 4
      WHEN 'packed' THEN 5
      WHEN 'label_ready' THEN 6
      WHEN 'shipped' THEN 7
      WHEN 'in_transit' THEN 8
      WHEN 'delivered' THEN 9
    END)
    INTO v_min_rank
    FROM public.supplier_fulfillments
    WHERE order_id = p_order_id
      AND status NOT IN ('cancelled', 'occurrence', 'returned');

    IF v_min_rank IS NULL THEN
      RETURN;
    END IF;

    v_new := CASE
      WHEN v_min_rank <= 1 THEN 'pago'
      WHEN v_min_rank <= 3 THEN 'recebido'
      WHEN v_min_rank <= 6 THEN 'embalado'
      ELSE 'enviado'
    END;
  END IF;

  IF v_new IS DISTINCT FROM v_current AND pg_trigger_depth() < 4 THEN
    UPDATE public.orders SET status = v_new, updated_at = now() WHERE id = p_order_id;
  END IF;
END;
$$;

-- Histórico + auditoria + rollup após transição
CREATE OR REPLACE FUNCTION public.handle_fulfillment_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.supplier_fulfillment_status_history (fulfillment_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid());

    PERFORM public.log_supplier_audit(
      NEW.supplier_organization_id,
      'fulfillment_status_change',
      'supplier_fulfillment',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'tracking_code', NEW.tracking_code),
      jsonb_build_object('order_id', NEW.order_id)
    );

    PERFORM public.recompute_order_status(NEW.order_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_fulfillment_status_change_trigger ON public.supplier_fulfillments;
CREATE TRIGGER handle_fulfillment_status_change_trigger
  AFTER UPDATE ON public.supplier_fulfillments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_fulfillment_status_change();

-- =============================================================================
-- Helper: usuário é dono (customer) ou revendedor do pedido
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_order_stakeholder(_user_id UUID, _order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = _order_id
      AND (o.user_id = _user_id OR o.reseller_id = _user_id)
  );
$$;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.supplier_fulfillments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_fulfillment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_fulfillment_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own fulfillments"
  ON public.supplier_fulfillments FOR SELECT
  TO authenticated
  USING (
    public.is_supplier_org_member(supplier_organization_id, auth.uid())
    OR public.is_admin_user()
    OR public.is_order_stakeholder(auth.uid(), order_id)
  );

CREATE POLICY "Members can update own fulfillments"
  ON public.supplier_fulfillments FOR UPDATE
  TO authenticated
  USING (
    public.is_supplier_org_member(supplier_organization_id, auth.uid())
    OR public.is_admin_user()
  )
  WITH CHECK (
    public.is_supplier_org_member(supplier_organization_id, auth.uid())
    OR public.is_admin_user()
  );

CREATE POLICY "Admins can manage fulfillments"
  ON public.supplier_fulfillments FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Service role manages fulfillments"
  ON public.supplier_fulfillments FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Members can view own fulfillment items"
  ON public.supplier_fulfillment_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_fulfillments f
      WHERE f.id = fulfillment_id
        AND (
          public.is_supplier_org_member(f.supplier_organization_id, auth.uid())
          OR public.is_admin_user()
          OR public.is_order_stakeholder(auth.uid(), f.order_id)
        )
    )
  );

CREATE POLICY "Service role manages fulfillment items"
  ON public.supplier_fulfillment_items FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "Members can view own fulfillment history"
  ON public.supplier_fulfillment_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_fulfillments f
      WHERE f.id = fulfillment_id
        AND (
          public.is_supplier_org_member(f.supplier_organization_id, auth.uid())
          OR public.is_admin_user()
        )
    )
  );

CREATE POLICY "Service role manages fulfillment history"
  ON public.supplier_fulfillment_status_history FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
