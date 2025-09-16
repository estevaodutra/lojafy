-- Create realistic user profiles for the ranking
INSERT INTO auth.users (id, email, created_at, updated_at, email_confirmed_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'ana.silva@email.com', now() - interval '30 days', now(), now() - interval '30 days'),
  ('22222222-2222-2222-2222-222222222222', 'carlos.santos@email.com', now() - interval '25 days', now(), now() - interval '25 days'),
  ('33333333-3333-3333-3333-333333333333', 'maria.oliveira@email.com', now() - interval '20 days', now(), now() - interval '20 days'),
  ('44444444-4444-4444-4444-444444444444', 'joao.pereira@email.com', now() - interval '18 days', now(), now() - interval '18 days'),
  ('55555555-5555-5555-5555-555555555555', 'fernanda.costa@email.com', now() - interval '15 days', now(), now() - interval '15 days'),
  ('66666666-6666-6666-6666-666666666666', 'ricardo.almeida@email.com', now() - interval '12 days', now(), now() - interval '12 days'),
  ('77777777-7777-7777-7777-777777777777', 'patricia.lima@email.com', now() - interval '10 days', now(), now() - interval '10 days'),
  ('88888888-8888-8888-8888-888888888888', 'roberto.souza@email.com', now() - interval '8 days', now(), now() - interval '8 days'),
  ('99999999-9999-9999-9999-999999999999', 'juliana.ferreira@email.com', now() - interval '6 days', now(), now() - interval '6 days'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'marcos.rodrigues@email.com', now() - interval '5 days', now(), now() - interval '5 days'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'luciana.barbosa@email.com', now() - interval '4 days', now(), now() - interval '4 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'anderson.martins@email.com', now() - interval '3 days', now(), now() - interval '3 days'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'camila.araujo@email.com', now() - interval '2 days', now(), now() - interval '2 days'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'rafael.gomes@email.com', now() - interval '1 day', now(), now() - interval '1 day'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bianca.mendes@email.com', now() - interval '12 hours', now(), now() - interval '12 hours')
ON CONFLICT (id) DO NOTHING;

-- Create profiles for the users
INSERT INTO profiles (user_id, first_name, last_name, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Ana', 'Silva', now() - interval '30 days', now()),
  ('22222222-2222-2222-2222-222222222222', 'Carlos', 'Santos', now() - interval '25 days', now()),
  ('33333333-3333-3333-3333-333333333333', 'Maria', 'Oliveira', now() - interval '20 days', now()),
  ('44444444-4444-4444-4444-444444444444', 'João', 'Pereira', now() - interval '18 days', now()),
  ('55555555-5555-5555-5555-555555555555', 'Fernanda', 'Costa', now() - interval '15 days', now()),
  ('66666666-6666-6666-6666-666666666666', 'Ricardo', 'Almeida', now() - interval '12 days', now()),
  ('77777777-7777-7777-7777-777777777777', 'Patrícia', 'Lima', now() - interval '10 days', now()),
  ('88888888-8888-8888-8888-888888888888', 'Roberto', 'Souza', now() - interval '8 days', now()),
  ('99999999-9999-9999-9999-999999999999', 'Juliana', 'Ferreira', now() - interval '6 days', now()),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Marcos', 'Rodrigues', now() - interval '5 days', now()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Luciana', 'Barbosa', now() - interval '4 days', now()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Anderson', 'Martins', now() - interval '3 days', now()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Camila', 'Araújo', now() - interval '2 days', now()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Rafael', 'Gomes', now() - interval '1 day', now()),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Bianca', 'Mendes', now() - interval '12 hours', now())
ON CONFLICT (user_id) DO NOTHING;

-- Create orders for the last 7 days focusing on products with 20-35% margin
-- Top product: Mini Máquina Seladora (35-40 sales)
INSERT INTO orders (user_id, order_number, status, total_amount, created_at, updated_at)
SELECT 
  user_ids.user_id,
  generate_order_number(),
  CASE WHEN random() < 0.7 THEN 'confirmed' 
       WHEN random() < 0.9 THEN 'shipped' 
       ELSE 'delivered' END,
  49.90,
  now() - (random() * interval '7 days'),
  now()
FROM (
  SELECT unnest(ARRAY[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'ffffffff-ffff-ffff-ffff-ffffffffffff'
  ]) AS user_id
) user_ids
CROSS JOIN generate_series(1, 38) -- Generate 38 orders for top product
WHERE EXISTS (SELECT 1 FROM products WHERE name = 'Mini Máquina Seladora');

-- Get the Mini Máquina Seladora product ID for order items
WITH mini_seladora AS (
  SELECT id, name, price FROM products WHERE name = 'Mini Máquina Seladora' LIMIT 1
),
recent_orders AS (
  SELECT id, total_amount, created_at 
  FROM orders 
  WHERE created_at >= now() - interval '7 days' 
  AND total_amount = 49.90
  ORDER BY created_at DESC
  LIMIT 38
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  ro.id,
  ms.id,
  CASE WHEN random() < 0.6 THEN 1 
       WHEN random() < 0.9 THEN 2 
       ELSE 3 END,
  ms.price,
  CASE WHEN random() < 0.6 THEN ms.price 
       WHEN random() < 0.9 THEN ms.price * 2 
       ELSE ms.price * 3 END,
  ro.created_at
FROM recent_orders ro
CROSS JOIN mini_seladora ms;

-- Create orders for other top products with 20-35% margin
-- Product 2: Emplastro Adesivo (25-30 sales)
INSERT INTO orders (user_id, order_number, status, total_amount, created_at, updated_at)
SELECT 
  user_ids.user_id,
  generate_order_number(),
  CASE WHEN random() < 0.7 THEN 'confirmed' 
       WHEN random() < 0.9 THEN 'shipped' 
       ELSE 'delivered' END,
  15.90,
  now() - (random() * interval '7 days'),
  now()
FROM (
  SELECT unnest(ARRAY[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555',
    '66666666-6666-6666-6666-666666666666',
    '77777777-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ]) AS user_id
) user_ids
CROSS JOIN generate_series(1, 28) -- Generate 28 orders
WHERE EXISTS (SELECT 1 FROM products WHERE name = 'Emplastro Adesivo');

-- Add order items for Emplastro Adesivo
WITH emplastro AS (
  SELECT id, name, price FROM products WHERE name = 'Emplastro Adesivo' LIMIT 1
),
emplastro_orders AS (
  SELECT id, total_amount, created_at 
  FROM orders 
  WHERE created_at >= now() - interval '7 days' 
  AND total_amount = 15.90
  ORDER BY created_at DESC
  LIMIT 28
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  eo.id,
  e.id,
  1,
  e.price,
  e.price,
  eo.created_at
FROM emplastro_orders eo
CROSS JOIN emplastro e;

-- Product 3: Kit Adesivos Varizes (20-25 sales)
INSERT INTO orders (user_id, order_number, status, total_amount, created_at, updated_at)
SELECT 
  user_ids.user_id,
  generate_order_number(),
  CASE WHEN random() < 0.7 THEN 'confirmed' 
       WHEN random() < 0.9 THEN 'shipped' 
       ELSE 'delivered' END,
  15.90,
  now() - (random() * interval '7 days'),
  now()
FROM (
  SELECT unnest(ARRAY[
    '11111111-1111-1111-1111-111111111111',
    '33333333-3333-3333-3333-333333333333',
    '55555555-5555-5555-5555-555555555555',
    '77777777-7777-7777-7777-777777777777',
    '99999999-9999-9999-9999-999999999999',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'dddddddd-dddd-dddd-dddd-dddddddddddd'
  ]) AS user_id
) user_ids
CROSS JOIN generate_series(1, 22) -- Generate 22 orders
WHERE EXISTS (SELECT 1 FROM products WHERE name = 'Kit Adesivos Varizes');

-- Add order items for Kit Adesivos Varizes
WITH kit_varizes AS (
  SELECT id, name, price FROM products WHERE name = 'Kit Adesivos Varizes' LIMIT 1
),
kit_orders AS (
  SELECT id, total_amount, created_at 
  FROM orders 
  WHERE created_at >= now() - interval '7 days' 
  AND total_amount = 15.90
  AND id NOT IN (
    SELECT DISTINCT order_id FROM order_items 
    WHERE product_id IN (SELECT id FROM products WHERE name = 'Emplastro Adesivo')
  )
  ORDER BY created_at DESC
  LIMIT 22
)
INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  ko.id,
  kv.id,
  1,
  kv.price,
  kv.price,
  ko.created_at
FROM kit_orders ko
CROSS JOIN kit_varizes kv;