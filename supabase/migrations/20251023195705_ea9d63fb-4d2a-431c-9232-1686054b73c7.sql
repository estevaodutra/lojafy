-- Enable auto-pricing for all products with cost_price defined (active and inactive)
UPDATE products
SET use_auto_pricing = true
WHERE cost_price IS NOT NULL 
  AND cost_price > 0;