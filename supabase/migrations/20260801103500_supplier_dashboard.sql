-- =============================================================================
-- Módulo Fornecedor P1 — Métricas do dashboard operacional em uma viagem
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_supplier_dashboard_metrics(p_org_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF NOT (public.is_supplier_org_member(p_org_id, auth.uid()) OR public.is_admin_user() OR auth.uid() IS NULL) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT json_build_object(
    'awaiting_picking', count(*) FILTER (WHERE f.status = 'awaiting_picking'),
    'picking', count(*) FILTER (WHERE f.status IN ('picking', 'picked')),
    'packing', count(*) FILTER (WHERE f.status IN ('packing', 'packed')),
    'labels_pending', count(*) FILTER (
      WHERE f.status IN ('packed', 'label_ready') AND f.label_status IN ('none', 'pending', 'error')
    ),
    'due_today', count(*) FILTER (
      WHERE f.status IN ('awaiting_picking', 'picking', 'picked', 'packing', 'packed', 'label_ready')
        AND f.sla_shipping_deadline::date = CURRENT_DATE
    ),
    'late', count(*) FILTER (
      WHERE f.status IN ('awaiting_picking', 'picking', 'picked', 'packing', 'packed', 'label_ready')
        AND f.sla_shipping_deadline < now()
    ),
    'shipped_today', count(*) FILTER (WHERE f.shipped_at::date = CURRENT_DATE),
    'occurrences_open', (
      SELECT count(*) FROM public.supplier_occurrences o
      WHERE o.organization_id = p_org_id AND o.status IN ('open', 'in_progress')
    ),
    'critical_stock', (
      SELECT count(*) FROM public.products p
      WHERE p.supplier_organization_id = p_org_id
        AND p.active = true
        AND COALESCE(p.stock_quantity, 0) <= COALESCE(p.min_stock_level, 5)
    ),
    'avg_picking_hours_7d', (
      SELECT round(avg(EXTRACT(EPOCH FROM (h.created_at - f2.created_at)) / 3600.0)::numeric, 1)
      FROM public.supplier_fulfillment_status_history h
      JOIN public.supplier_fulfillments f2 ON f2.id = h.fulfillment_id
      WHERE f2.supplier_organization_id = p_org_id
        AND h.to_status = 'picked'
        AND h.created_at >= now() - interval '7 days'
    )
  )
  INTO v_result
  FROM public.supplier_fulfillments f
  WHERE f.supplier_organization_id = p_org_id;

  RETURN v_result;
END;
$$;
