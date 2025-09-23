-- Update existing reseller stores with slugs if they don't have one
UPDATE public.reseller_stores 
SET store_slug = LOWER(REPLACE(REPLACE(store_name, ' ', '-'), 'ã', 'a'))
WHERE store_slug IS NULL OR store_slug = '';

-- Update reseller stores to ensure default slugs are generated for existing stores
UPDATE public.reseller_stores 
SET store_slug = 'loja-' || SUBSTRING(id::text FROM 1 FOR 8)
WHERE store_slug IS NULL OR store_slug = '';

-- Create function to generate unique store slugs
CREATE OR REPLACE FUNCTION public.generate_unique_store_slug(store_name_param TEXT, store_id_param UUID DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  -- Generate base slug from store name
  base_slug := LOWER(TRIM(REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(store_name_param, '[áàãâä]', 'a', 'g'),
      '[éèêë]', 'e', 'g'
    ),
    '[^a-z0-9\s-]', '', 'g'
  )));
  
  base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
  base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
  base_slug := TRIM(base_slug, '-');
  
  -- Ensure slug is not empty
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'loja';
  END IF;
  
  final_slug := base_slug;
  
  -- Check for uniqueness and increment if necessary
  WHILE EXISTS (
    SELECT 1 FROM reseller_stores 
    WHERE store_slug = final_slug 
    AND (store_id_param IS NULL OR id != store_id_param)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- Create trigger function to auto-generate store_slug
CREATE OR REPLACE FUNCTION public.auto_generate_store_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-generate store_slug if empty on INSERT
  IF TG_OP = 'INSERT' AND (NEW.store_slug IS NULL OR NEW.store_slug = '') THEN
    NEW.store_slug := public.generate_unique_store_slug(NEW.store_name, NEW.id);
  END IF;
  
  -- Auto-generate store_slug if empty on UPDATE and store_name changed
  IF TG_OP = 'UPDATE' AND (NEW.store_slug IS NULL OR NEW.store_slug = '') THEN
    NEW.store_slug := public.generate_unique_store_slug(NEW.store_name, NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating store slugs
CREATE TRIGGER trigger_auto_generate_store_slug
  BEFORE INSERT OR UPDATE ON public.reseller_stores
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_store_slug();