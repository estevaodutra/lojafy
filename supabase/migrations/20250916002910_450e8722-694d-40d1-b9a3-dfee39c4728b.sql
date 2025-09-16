-- First, let's get existing users or create orders with a generic approach
-- We'll create orders for products with 20-35% margin without specific users for now

WITH margin_products AS (
  SELECT id, name, price, cost_price,
    CASE WHEN cost_price > 0 THEN 
      ((price - cost_price) / price * 100)
    ELSE 0 END as margin_percent
  FROM products 
  WHERE cost_price > 0 
    AND active = true
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
  ORDER BY margin_percent DESC
  LIMIT 10
),
-- Get any existing user from profiles table
existing_user AS (
  SELECT user_id FROM profiles LIMIT 1
),
-- Create a sales distribution strategy
products_with_sales AS (
  SELECT 
    mp.*,
    ROW_NUMBER() OVER (ORDER BY mp.margin_percent DESC) as rank,
    CASE ROW_NUMBER() OVER (ORDER BY mp.margin_percent DESC)
      WHEN 1 THEN 35  -- Top product gets 35 sales
      WHEN 2 THEN 25  -- Second gets 25 sales
      WHEN 3 THEN 18  -- Third gets 18 sales
      WHEN 4 THEN 14  -- Fourth gets 14 sales
      WHEN 5 THEN 11  -- Fifth gets 11 sales
      WHEN 6 THEN 9   -- Sixth gets 9 sales
      WHEN 7 THEN 7   -- Seventh gets 7 sales
      WHEN 8 THEN 5   -- Eighth gets 5 sales
      WHEN 9 THEN 4   -- Ninth gets 4 sales
      ELSE 3          -- Tenth gets 3 sales
    END as target_sales
  FROM margin_products mp
)
-- Insert orders for the top margin products
INSERT INTO orders (user_id, order_number, status, total_amount, created_at, updated_at)
SELECT 
  COALESCE(eu.user_id, gen_random_uuid()), -- Use existing user or generate UUID
  generate_order_number(),
  CASE WHEN random() < 0.7 THEN 'confirmed' 
       WHEN random() < 0.9 THEN 'shipped' 
       ELSE 'delivered' END,
  pws.price * (1 + floor(random() * 2)), -- Quantity 1 or 2
  now() - (random() * interval '7 days'),
  now()
FROM products_with_sales pws
CROSS JOIN existing_user eu
CROSS JOIN generate_series(1, 1) gs
WHERE gs.ordinality <= pws.target_sales;

-- Now create order_items for recent orders
WITH recent_orders AS (
  SELECT id, total_amount, created_at
  FROM orders 
  WHERE created_at >= now() - interval '8 days'
  AND order_number LIKE 'ORD-%'
  ORDER BY created_at DESC
  LIMIT 100
),
margin_products AS (
  SELECT id, name, price, cost_price
  FROM products 
  WHERE cost_price > 0 
    AND active = true
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
  ORDER BY ((price - cost_price) / price * 100) DESC
  LIMIT 10
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT DISTINCT ON (ro.id)
  ro.id,
  mp.id,
  CASE WHEN ro.total_amount > mp.price * 1.5 THEN 2 ELSE 1 END,
  mp.price,
  ro.total_amount,
  ro.created_at
FROM recent_orders ro
CROSS JOIN margin_products mp
WHERE abs(ro.total_amount - mp.price) < mp.price * 0.5 -- Match by price similarity
   OR abs(ro.total_amount - mp.price * 2) < mp.price * 0.5
ORDER BY ro.id, random(); -- Random product selection for each order