-- Create realistic profiles for ranking (using dummy user IDs)
INSERT INTO profiles (user_id, first_name, last_name, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111'::uuid, 'Ana', 'Silva', now() - interval '30 days', now()),
  ('22222222-2222-2222-2222-222222222222'::uuid, 'Carlos', 'Santos', now() - interval '25 days', now()),
  ('33333333-3333-3333-3333-333333333333'::uuid, 'Maria', 'Oliveira', now() - interval '20 days', now()),
  ('44444444-4444-4444-4444-444444444444'::uuid, 'João', 'Pereira', now() - interval '18 days', now()),
  ('55555555-5555-5555-5555-555555555555'::uuid, 'Fernanda', 'Costa', now() - interval '15 days', now()),
  ('66666666-6666-6666-6666-666666666666'::uuid, 'Ricardo', 'Almeida', now() - interval '12 days', now()),
  ('77777777-7777-7777-7777-777777777777'::uuid, 'Patrícia', 'Lima', now() - interval '10 days', now()),
  ('88888888-8888-8888-8888-888888888888'::uuid, 'Roberto', 'Souza', now() - interval '8 days', now()),
  ('99999999-9999-9999-9999-999999999999'::uuid, 'Juliana', 'Ferreira', now() - interval '6 days', now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'Marcos', 'Rodrigues', now() - interval '5 days', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'Luciana', 'Barbosa', now() - interval '4 days', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'Anderson', 'Martins', now() - interval '3 days', now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid, 'Camila', 'Araújo', now() - interval '2 days', now()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid, 'Rafael', 'Gomes', now() - interval '1 day', now()),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid, 'Bianca', 'Mendes', now() - interval '12 hours', now())
ON CONFLICT (user_id) DO NOTHING;

-- Get product IDs with good margins (20-35%)
WITH margin_products AS (
  SELECT id, name, price, cost_price,
    CASE WHEN cost_price > 0 THEN 
      ((price - cost_price) / price * 100)
    ELSE 0 END as margin_percent
  FROM products 
  WHERE cost_price > 0 
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
  ORDER BY margin_percent DESC
  LIMIT 10
),
user_pool AS (
  SELECT unnest(ARRAY[
    '11111111-1111-1111-1111-111111111111'::uuid,
    '22222222-2222-2222-2222-222222222222'::uuid,
    '33333333-3333-3333-3333-333333333333'::uuid,
    '44444444-4444-4444-4444-444444444444'::uuid,
    '55555555-5555-5555-5555-555555555555'::uuid,
    '66666666-6666-6666-6666-666666666666'::uuid,
    '77777777-7777-7777-7777-777777777777'::uuid,
    '88888888-8888-8888-8888-888888888888'::uuid,
    '99999999-9999-9999-9999-999999999999'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
    'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
    'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
    'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid
  ]) AS user_id
),
-- Generate sales distribution for top 10 products
sales_distribution AS (
  SELECT 
    mp.*,
    ROW_NUMBER() OVER (ORDER BY mp.margin_percent DESC) as rank,
    CASE ROW_NUMBER() OVER (ORDER BY mp.margin_percent DESC)
      WHEN 1 THEN 40  -- Top product gets 40 sales
      WHEN 2 THEN 28  -- Second gets 28 sales
      WHEN 3 THEN 22  -- Third gets 22 sales
      WHEN 4 THEN 18  -- Fourth gets 18 sales
      WHEN 5 THEN 15  -- Fifth gets 15 sales
      WHEN 6 THEN 12  -- Sixth gets 12 sales  
      WHEN 7 THEN 10  -- Seventh gets 10 sales
      WHEN 8 THEN 8   -- Eighth gets 8 sales
      WHEN 9 THEN 6   -- Ninth gets 6 sales
      ELSE 4          -- Tenth gets 4 sales
    END as target_sales
  FROM margin_products mp
)
-- Create orders for each product based on sales distribution
INSERT INTO orders (user_id, order_number, status, total_amount, created_at, updated_at)
SELECT 
  (user_pool.user_id),
  generate_order_number(),
  CASE WHEN random() < 0.7 THEN 'confirmed' 
       WHEN random() < 0.9 THEN 'shipped' 
       ELSE 'delivered' END,
  sd.price * (1 + floor(random() * 2)), -- Quantity 1 or 2
  now() - (random() * interval '7 days'),
  now()
FROM sales_distribution sd
CROSS JOIN user_pool
CROSS JOIN generate_series(1, 1) -- Will be controlled by the sales target
WHERE generate_series <= sd.target_sales
AND random() < (sd.target_sales::float / 15.0); -- Distribute sales across users

-- Now create order_items for the orders we just created
WITH recent_orders AS (
  SELECT id, total_amount, created_at, user_id
  FROM orders 
  WHERE created_at >= now() - interval '8 days' -- Get orders from last 8 days to be safe
  AND order_number LIKE 'ORD-%'
),
margin_products AS (
  SELECT id, name, price, cost_price,
    CASE WHEN cost_price > 0 THEN 
      ((price - cost_price) / price * 100)
    ELSE 0 END as margin_percent
  FROM products 
  WHERE cost_price > 0 
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
  ORDER BY margin_percent DESC
  LIMIT 10
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  ro.id,
  mp.id,
  CASE WHEN ro.total_amount > mp.price * 1.5 THEN 2 ELSE 1 END,
  mp.price,
  ro.total_amount,
  ro.created_at
FROM recent_orders ro
CROSS JOIN margin_products mp
WHERE abs(ro.total_amount - mp.price) < mp.price * 0.6 -- Match orders to products by price similarity
   OR abs(ro.total_amount - mp.price * 2) < mp.price * 0.6 -- Or double price for quantity 2
LIMIT 100; -- Limit to prevent too many inserts