-- =============================================================================
-- Módulo Fornecedor P1 — Ocorrências operacionais
-- Substitui os fluxos órfãos de cancelamento/devolução/em-falta/reposição por
-- um registro único de ocorrência, opcionalmente ligado a fulfillment/pedido/
-- produto. A sincronização com o status do fulfillment é feita na camada de
-- serviço (frontend), não por trigger.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_occurrences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.supplier_organizations(id) ON DELETE CASCADE,
  fulfillment_id UUID REFERENCES public.supplier_fulfillments(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  occurrence_type TEXT NOT NULL CHECK (occurrence_type IN (
    'out_of_stock', 'damaged', 'wrong_item', 'shipping_issue',
    'cancellation_request', 'carrier_delay', 'other'
  )),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
  title TEXT NOT NULL,
  description TEXT,
  resolution_notes TEXT,
  created_by UUID,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_occurrences_org_status
  ON public.supplier_occurrences(organization_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_occurrences_fulfillment
  ON public.supplier_occurrences(fulfillment_id);

CREATE TRIGGER update_supplier_occurrences_updated_at BEFORE UPDATE ON public.supplier_occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.audit_supplier_occurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_supplier_audit(
      NEW.organization_id, 'occurrence_opened', 'supplier_occurrence', NEW.id,
      NULL, to_jsonb(NEW), NULL
    );
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.log_supplier_audit(
      NEW.organization_id, 'occurrence_status_change', 'supplier_occurrence', NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status, 'resolution_notes', NEW.resolution_notes),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_supplier_occurrence_trigger ON public.supplier_occurrences;
CREATE TRIGGER audit_supplier_occurrence_trigger
  AFTER INSERT OR UPDATE ON public.supplier_occurrences
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_supplier_occurrence();

ALTER TABLE public.supplier_occurrences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view own occurrences"
  ON public.supplier_occurrences FOR SELECT
  TO authenticated
  USING (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Members can create own occurrences"
  ON public.supplier_occurrences FOR INSERT
  TO authenticated
  WITH CHECK (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Members can update own occurrences"
  ON public.supplier_occurrences FOR UPDATE
  TO authenticated
  USING (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user())
  WITH CHECK (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Service role manages occurrences"
  ON public.supplier_occurrences FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
