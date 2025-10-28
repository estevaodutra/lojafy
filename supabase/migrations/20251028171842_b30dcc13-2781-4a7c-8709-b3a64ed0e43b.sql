-- Add product_name_snapshot to reseller_products to handle deleted products
ALTER TABLE public.reseller_products 
ADD COLUMN IF NOT EXISTS product_name_snapshot TEXT;

-- Update existing records with current product names
UPDATE public.reseller_products rp
SET product_name_snapshot = p.name
FROM public.products p
WHERE rp.product_id = p.id AND rp.product_name_snapshot IS NULL;

-- Create function to auto-capture product name on insert
CREATE OR REPLACE FUNCTION public.capture_product_name_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  SELECT name INTO NEW.product_name_snapshot
  FROM public.products
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to capture product name on insert
DROP TRIGGER IF EXISTS capture_product_name_on_insert ON public.reseller_products;
CREATE TRIGGER capture_product_name_on_insert
  BEFORE INSERT ON public.reseller_products
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_product_name_snapshot();