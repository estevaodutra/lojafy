-- Fix security warnings by setting proper search_path for functions

-- Update generate_gtin_ean13 function with proper search path
CREATE OR REPLACE FUNCTION public.generate_gtin_ean13()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gtin TEXT;
BEGIN
  gtin := '789' || LPAD(floor(random() * 10000000000)::TEXT, 10, '0');
  RETURN gtin;
END;
$$;

-- Update generate_sku function with proper search path
CREATE OR REPLACE FUNCTION public.generate_sku(category_name TEXT DEFAULT NULL, brand_name TEXT DEFAULT NULL)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sku_prefix TEXT := '';
  sku_counter INTEGER;
  final_sku TEXT;
BEGIN
  -- Create prefix from category and brand
  IF category_name IS NOT NULL THEN
    sku_prefix := sku_prefix || UPPER(LEFT(REGEXP_REPLACE(category_name, '[^a-zA-Z]', '', 'g'), 4));
  END IF;
  
  IF brand_name IS NOT NULL THEN
    sku_prefix := sku_prefix || '-' || UPPER(LEFT(REGEXP_REPLACE(brand_name, '[^a-zA-Z]', '', 'g'), 4));
  END IF;
  
  IF sku_prefix = '' THEN
    sku_prefix := 'PROD';
  END IF;
  
  -- Get next counter
  SELECT COALESCE(MAX(CAST(RIGHT(sku, 3) AS INTEGER)), 0) + 1
  INTO sku_counter
  FROM products 
  WHERE sku LIKE sku_prefix || '%';
  
  final_sku := sku_prefix || '-' || LPAD(sku_counter::TEXT, 3, '0');
  
  RETURN final_sku;
END;
$$;

-- Update auto_generate_product_codes function with proper search path
CREATE OR REPLACE FUNCTION public.auto_generate_product_codes()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-generate GTIN/EAN-13 if empty
  IF NEW.gtin_ean13 IS NULL OR NEW.gtin_ean13 = '' THEN
    NEW.gtin_ean13 := public.generate_gtin_ean13();
  END IF;
  
  -- Auto-generate SKU if empty
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := public.generate_sku(
      (SELECT name FROM categories WHERE id = NEW.category_id),
      NEW.brand
    );
  END IF;
  
  RETURN NEW;
END;
$$;