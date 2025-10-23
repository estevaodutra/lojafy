-- Add use_auto_pricing column to products table
ALTER TABLE products 
ADD COLUMN use_auto_pricing BOOLEAN DEFAULT false;

-- Create index for performance
CREATE INDEX idx_products_auto_pricing ON products(use_auto_pricing) WHERE use_auto_pricing = true;

-- Add comment for documentation
COMMENT ON COLUMN products.use_auto_pricing IS 'Indicates if product price is calculated automatically based on cost_price and platform settings';

-- Enable auto-pricing for all active products with cost_price defined
UPDATE products
SET use_auto_pricing = true
WHERE active = true 
  AND cost_price IS NOT NULL 
  AND cost_price > 0;