-- Add cost_price column to product_variants
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC;

-- Migrate existing data: copy price_modifier to cost_price
UPDATE public.product_variants 
SET cost_price = price_modifier
WHERE cost_price IS NULL AND price_modifier IS NOT NULL;