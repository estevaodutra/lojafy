-- 20260801123500_redefine_auto_generate_internal_sku.sql
-- Redefine a função auto_generate_internal_sku() e seu trigger para usar a assinatura de 1 parâmetro de next_internal_sku.

CREATE OR REPLACE FUNCTION public.auto_generate_internal_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := public.next_internal_sku(NEW.supplier_organization_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_generate_internal_sku_trigger ON public.products;
CREATE TRIGGER auto_generate_internal_sku_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_internal_sku();
