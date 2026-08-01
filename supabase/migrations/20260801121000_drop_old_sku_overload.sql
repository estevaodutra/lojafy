-- 20260801121000_drop_old_sku_overload.sql
-- Remove a sobrecarga antiga da função next_internal_sku(UUID, TEXT) para evitar conflitos de geração de SKU com traço.

DROP FUNCTION IF EXISTS public.next_internal_sku(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.next_internal_sku(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_code TEXT;
  v_seq INTEGER;
  v_prefix TEXT;
BEGIN
  SELECT org_code INTO v_org_code FROM public.supplier_organizations WHERE id = p_org_id;
  v_org_code := COALESCE(v_org_code, 'ADM');
  v_org_code := upper(regexp_replace(v_org_code, '[^a-zA-Z0-9]', '', 'g'));
  v_prefix := 'LJF' || v_org_code;

  INSERT INTO public.supplier_sku_sequences (prefix, organization_id, last_seq)
  VALUES (v_prefix, p_org_id, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_seq = supplier_sku_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_prefix || lpad(v_seq::text, 6, '0');
END;
$$;
