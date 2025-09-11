-- Add new fields to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS gtin_ean13 VARCHAR(13),
ADD COLUMN IF NOT EXISTS subcategory_id UUID,
ADD COLUMN IF NOT EXISTS height NUMERIC,
ADD COLUMN IF NOT EXISTS width NUMERIC,
ADD COLUMN IF NOT EXISTS length NUMERIC,
ADD COLUMN IF NOT EXISTS weight NUMERIC,
ADD COLUMN IF NOT EXISTS main_image_url TEXT;

-- Create subcategories table
CREATE TABLE IF NOT EXISTS public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('color', 'size', 'model')),
  name TEXT NOT NULL,
  value TEXT NOT NULL,
  price_modifier NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for subcategories
CREATE POLICY "Anyone can view active subcategories" 
ON public.subcategories 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admins can manage subcategories" 
ON public.subcategories 
FOR ALL 
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])))));

-- RLS policies for product_variants
CREATE POLICY "Anyone can view active product variants" 
ON public.product_variants 
FOR SELECT 
USING (active = true);

CREATE POLICY "Admins can manage product variants" 
ON public.product_variants 
FOR ALL 
USING (EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])))));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for product images
CREATE POLICY "Anyone can view product images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'product-images' AND EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])))));

CREATE POLICY "Admins can update product images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'product-images' AND EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])))));

CREATE POLICY "Admins can delete product images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'product-images' AND EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])))));

-- Function to generate GTIN/EAN-13
CREATE OR REPLACE FUNCTION public.generate_gtin_ean13()
RETURNS TEXT AS $$
DECLARE
  gtin TEXT;
BEGIN
  gtin := '789' || LPAD(floor(random() * 10000000000)::TEXT, 10, '0');
  RETURN gtin;
END;
$$ LANGUAGE plpgsql;

-- Function to generate SKU
CREATE OR REPLACE FUNCTION public.generate_sku(category_name TEXT DEFAULT NULL, brand_name TEXT DEFAULT NULL)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate GTIN and SKU
CREATE OR REPLACE FUNCTION public.auto_generate_product_codes()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER auto_generate_product_codes_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_product_codes();

-- Add triggers for updated_at on new tables
CREATE OR REPLACE TRIGGER update_subcategories_updated_at
  BEFORE UPDATE ON public.subcategories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add foreign key constraints
ALTER TABLE public.subcategories 
ADD CONSTRAINT fk_subcategories_category 
FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE public.product_variants 
ADD CONSTRAINT fk_product_variants_product 
FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;

ALTER TABLE public.products 
ADD CONSTRAINT fk_products_subcategory 
FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON public.subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON public.products(subcategory_id);
CREATE INDEX IF NOT EXISTS idx_products_gtin_ean13 ON public.products(gtin_ean13);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);