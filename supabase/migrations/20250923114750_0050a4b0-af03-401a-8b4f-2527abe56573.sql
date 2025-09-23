-- Create or update trigger to auto-generate store_slug if empty
CREATE OR REPLACE TRIGGER trigger_auto_generate_store_slug
  BEFORE INSERT OR UPDATE ON public.reseller_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_store_slug();