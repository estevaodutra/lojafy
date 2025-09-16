-- Create orders with products that have 20-35% profit margin for ranking
-- Clean up any previous seed data first
DELETE FROM order_items WHERE order_id IN (
  SELECT id FROM orders WHERE external_reference LIKE 'ranking_seed_%'
);
DELETE FROM orders WHERE external_reference LIKE 'ranking_seed_%';

-- Get products with 20-35% margin and create realistic sales data
WITH margin_products AS (
  SELECT 
    id, 
    name, 
    price, 
    cost_price,
    ((price - COALESCE(cost_price, 0)) / price * 100) as margin_percent
  FROM products 
  WHERE active = true
    AND price > 0
    AND cost_price IS NOT NULL
    AND cost_price > 0
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
  ORDER BY ((price - cost_price) / price * 100) DESC
  LIMIT 10
),
user_for_orders AS (
  SELECT COALESCE((SELECT user_id FROM profiles LIMIT 1), gen_random_uuid()) as user_id
),
top_products AS (
  SELECT 
    mp.*,
    ROW_NUMBER() OVER (ORDER BY margin_percent DESC) as position,
    CASE ROW_NUMBER() OVER (ORDER BY margin_percent DESC)
      WHEN 1 THEN 45  -- #1 gets 45 sales
      WHEN 2 THEN 32  -- #2 gets 32 sales  
      WHEN 3 THEN 25  -- #3 gets 25 sales
      WHEN 4 THEN 19  -- #4 gets 19 sales
      WHEN 5 THEN 15  -- #5 gets 15 sales
      WHEN 6 THEN 12  -- #6 gets 12 sales
      WHEN 7 THEN 9   -- #7 gets 9 sales
      WHEN 8 THEN 7   -- #8 gets 7 sales
      WHEN 9 THEN 5   -- #9 gets 5 sales
      ELSE 3          -- #10 gets 3 sales
    END as target_sales
  FROM margin_products mp
)
-- Insert orders for each product based on their target sales
INSERT INTO orders (user_id, order_number, status, total_amount, shipping_amount, tax_amount, created_at, updated_at, external_reference)
SELECT 
  ufo.user_id,
  generate_order_number(),
  'confirmed', -- Use valid status
  tp.price * quantity_info.qty,
  0,
  0,
  now() - (random() * interval '7 days'),
  now(),
  'ranking_seed_' || tp.id::text || '_' || sales_num.num
FROM top_products tp
CROSS JOIN user_for_orders ufo
CROSS JOIN generate_series(1, tp.target_sales) as sales_num(num)
CROSS JOIN LATERAL (
  SELECT (1 + floor(random() * 2))::int as qty
) quantity_info;

-- Now insert order_items for the orders we just created
WITH seeded_orders AS (
  SELECT 
    o.id as order_id,
    o.external_reference,
    o.total_amount,
    o.created_at,
    SUBSTRING(o.external_reference FROM 'ranking_seed_(.+)_\d+$')::uuid as product_id
  FROM orders o
  WHERE o.external_reference LIKE 'ranking_seed_%'
    AND o.created_at >= now() - interval '8 days'
),
margin_products AS (
  SELECT id, price
  FROM products
  WHERE active = true
    AND cost_price IS NOT NULL
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  so.order_id,
  so.product_id,
  CASE 
    WHEN so.total_amount >= mp.price * 1.8 THEN 2 
    ELSE 1 
  END as quantity,
  mp.price,
  so.total_amount,
  so.created_at
FROM seeded_orders so
JOIN margin_products mp ON mp.id = so.product_id;