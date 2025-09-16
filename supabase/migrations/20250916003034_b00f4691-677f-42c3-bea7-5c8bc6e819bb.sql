-- Seed ranking data for products with 20-35% margin
-- Cleanup previous seed data to keep operation idempotent
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE external_reference LIKE 'seed:%'
);
DELETE FROM orders WHERE external_reference LIKE 'seed:%';

WITH margin_products AS (
  SELECT id, name, price, cost_price,
    CASE WHEN price > 0 AND cost_price IS NOT NULL THEN 
      ((price - cost_price) / price * 100)
    ELSE 0 END AS margin_percent
  FROM products 
  WHERE active = true
    AND cost_price IS NOT NULL
    AND price IS NOT NULL
    AND price > 0
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
),
products_with_sales AS (
  SELECT 
    mp.*,
    ROW_NUMBER() OVER (ORDER BY mp.margin_percent DESC) AS rank,
    CASE ROW_NUMBER() OVER (ORDER BY mp.margin_percent DESC)
      WHEN 1 THEN 40
      WHEN 2 THEN 28
      WHEN 3 THEN 22
      WHEN 4 THEN 18
      WHEN 5 THEN 15
      WHEN 6 THEN 12
      WHEN 7 THEN 10
      WHEN 8 THEN 8
      WHEN 9 THEN 6
      ELSE 4
    END AS target_sales
  FROM margin_products mp
  LIMIT 10
),
selected_user AS (
  SELECT COALESCE((SELECT user_id FROM profiles LIMIT 1), gen_random_uuid()) AS user_id
)
-- Insert orders per product based on target_sales, distribute over last 7 days
INSERT INTO orders (user_id, order_number, status, total_amount, created_at, updated_at, external_reference)
SELECT 
  su.user_id,
  generate_order_number(),
  (ARRAY['confirmed','confirmed','confirmed','shipped','delivered','processing'])[ceil(random()*6)],
  (pws.price * qty.qty)::numeric,
  now() - (random() * interval '7 days'),
  now(),
  'seed:' || pws.id::text
FROM products_with_sales pws
CROSS JOIN selected_user su
CROSS JOIN LATERAL generate_series(1, pws.target_sales) gs(i)
CROSS JOIN LATERAL (SELECT (1 + floor(random() * 2))::int AS qty) qty;

-- Insert matching order_items for the seeded orders
WITH seeded_orders AS (
  SELECT id, external_reference, total_amount, created_at
  FROM orders 
  WHERE external_reference LIKE 'seed:%'
    AND created_at >= now() - interval '8 days'
),
products_with_sales AS (
  SELECT 
    mp.id,
    mp.price
  FROM margin_products mp
  ORDER BY ((price - cost_price) / price * 100) DESC
  LIMIT 10
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  so.id,
  pws.id,
  CASE WHEN so.total_amount >= pws.price * 1.5 THEN 2 ELSE 1 END AS quantity,
  pws.price,
  so.total_amount,
  so.created_at
FROM seeded_orders so
JOIN products_with_sales pws 
  ON so.external_reference = 'seed:' || pws.id::text;