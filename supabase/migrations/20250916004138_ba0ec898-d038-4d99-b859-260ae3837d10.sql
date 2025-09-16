-- Clean and recreate demo data with new criteria (50% markup, 35% margin)
DELETE FROM demo_order_items;
DELETE FROM demo_orders;
DELETE FROM demo_users;

-- Insert demo users
INSERT INTO demo_users (id, first_name, last_name, email) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Ana', 'Silva', 'ana.silva@email.com'),
('550e8400-e29b-41d4-a716-446655440002', 'Carlos', 'Santos', 'carlos.santos@email.com'),
('550e8400-e29b-41d4-a716-446655440003', 'Maria', 'Oliveira', 'maria.oliveira@email.com'),
('550e8400-e29b-41d4-a716-446655440004', 'João', 'Pereira', 'joao.pereira@email.com'),
('550e8400-e29b-41d4-a716-446655440005', 'Fernanda', 'Costa', 'fernanda.costa@email.com'),
('550e8400-e29b-41d4-a716-446655440006', 'Ricardo', 'Almeida', 'ricardo.almeida@email.com'),
('550e8400-e29b-41d4-a716-446655440007', 'Juliana', 'Ribeiro', 'juliana.ribeiro@email.com'),
('550e8400-e29b-41d4-a716-446655440008', 'Pedro', 'Fernandes', 'pedro.fernandes@email.com'),
('550e8400-e29b-41d4-a716-446655440009', 'Camila', 'Rodrigues', 'camila.rodrigues@email.com'),
('550e8400-e29b-41d4-a716-446655440010', 'Lucas', 'Martins', 'lucas.martins@email.com');

-- Insert demo orders with products that have approximately 50% markup and 35% margin
-- Formula: For 35% margin, cost_price = price * 0.65, so price = cost_price / 0.65 ≈ cost_price * 1.54
-- We'll use products where price ≈ cost_price * 1.5 (close to our target)
WITH selected_products AS (
  SELECT 
    id, 
    name, 
    price, 
    cost_price,
    ROUND((price - COALESCE(cost_price, price * 0.7)) / price * 100) as margin_percent
  FROM products 
  WHERE active = true 
    AND cost_price IS NOT NULL 
    AND cost_price > 0
    AND price >= cost_price * 1.4  -- At least 40% markup
    AND price <= cost_price * 1.6  -- At most 60% markup
  ORDER BY ABS((price / cost_price) - 1.5)  -- Closest to 50% markup
  LIMIT 15
),
demo_orders_data AS (
  SELECT 
    gen_random_uuid() as order_id,
    'ORD-DEMO-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0') as order_number,
    (ARRAY['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 
           '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004',
           '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006',
           '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440008',
           '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440010'])
           [1 + (random() * 9)::int] as demo_user_id,
    NOW() - (random() * interval '7 days') as created_date,
    p.id as product_id,
    p.price,
    1 + (random() * 4)::int as quantity  -- 1 to 5 items
  FROM selected_products p
  CROSS JOIN generate_series(1, 5 + (random() * 15)::int)  -- 5 to 20 orders per product
)
INSERT INTO demo_orders (id, order_number, demo_user_id, total_amount, status, created_at, demo_type)
SELECT 
  order_id,
  order_number,
  demo_user_id,
  price * quantity as total_amount,
  'confirmed',
  created_date,
  'ranking'
FROM demo_orders_data;

-- Insert demo order items
WITH demo_orders_data AS (
  SELECT 
    gen_random_uuid() as order_id,
    'ORD-DEMO-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0') as order_number,
    (ARRAY['550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 
           '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004',
           '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440006',
           '550e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440008',
           '550e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440010'])
           [1 + (random() * 9)::int] as demo_user_id,
    NOW() - (random() * interval '7 days') as created_date,
    p.id as product_id,
    p.price,
    1 + (random() * 4)::int as quantity,
    ROW_NUMBER() OVER() as row_num
  FROM (
    SELECT 
      id, 
      name, 
      price, 
      cost_price
    FROM products 
    WHERE active = true 
      AND cost_price IS NOT NULL 
      AND cost_price > 0
      AND price >= cost_price * 1.4
      AND price <= cost_price * 1.6
    ORDER BY ABS((price / cost_price) - 1.5)
    LIMIT 15
  ) p
  CROSS JOIN generate_series(1, 5 + (random() * 15)::int)
)
INSERT INTO demo_order_items (demo_order_id, product_id, quantity, unit_price, total_price)
SELECT 
  d.id as demo_order_id,
  dod.product_id,
  dod.quantity,
  dod.price as unit_price,
  dod.price * dod.quantity as total_price
FROM demo_orders_data dod
JOIN demo_orders d ON d.order_number = dod.order_number;