-- Clean and recreate demo data with new criteria (50% markup, 35% margin) - Fixed UUID casting
DELETE FROM demo_order_items;
DELETE FROM demo_orders;
DELETE FROM demo_users;

-- Insert demo users
INSERT INTO demo_users (id, first_name, last_name, email) VALUES
('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Ana', 'Silva', 'ana.silva@email.com'),
('550e8400-e29b-41d4-a716-446655440002'::uuid, 'Carlos', 'Santos', 'carlos.santos@email.com'),
('550e8400-e29b-41d4-a716-446655440003'::uuid, 'Maria', 'Oliveira', 'maria.oliveira@email.com'),
('550e8400-e29b-41d4-a716-446655440004'::uuid, 'João', 'Pereira', 'joao.pereira@email.com'),
('550e8400-e29b-41d4-a716-446655440005'::uuid, 'Fernanda', 'Costa', 'fernanda.costa@email.com'),
('550e8400-e29b-41d4-a716-446655440006'::uuid, 'Ricardo', 'Almeida', 'ricardo.almeida@email.com'),
('550e8400-e29b-41d4-a716-446655440007'::uuid, 'Juliana', 'Ribeiro', 'juliana.ribeiro@email.com'),
('550e8400-e29b-41d4-a716-446655440008'::uuid, 'Pedro', 'Fernandes', 'pedro.fernandes@email.com'),
('550e8400-e29b-41d4-a716-446655440009'::uuid, 'Camila', 'Rodrigues', 'camila.rodrigues@email.com'),
('550e8400-e29b-41d4-a716-446655440010'::uuid, 'Lucas', 'Martins', 'lucas.martins@email.com');

-- Create demo orders for products with ~50% markup and ~35% margin
DO $$
DECLARE
    product_record RECORD;
    order_record RECORD;
    user_ids uuid[] := ARRAY[
        '550e8400-e29b-41d4-a716-446655440001'::uuid,
        '550e8400-e29b-41d4-a716-446655440002'::uuid,
        '550e8400-e29b-41d4-a716-446655440003'::uuid,
        '550e8400-e29b-41d4-a716-446655440004'::uuid,
        '550e8400-e29b-41d4-a716-446655440005'::uuid,
        '550e8400-e29b-41d4-a716-446655440006'::uuid,
        '550e8400-e29b-41d4-a716-446655440007'::uuid,
        '550e8400-e29b-41d4-a716-446655440008'::uuid,
        '550e8400-e29b-41d4-a716-446655440009'::uuid,
        '550e8400-e29b-41d4-a716-446655440010'::uuid
    ];
    order_id uuid;
    order_count integer := 1;
    i integer;
    quantity integer;
    selected_user uuid;
    order_date timestamp with time zone;
BEGIN
    -- Select products with approximately 50% markup (price ~1.5x cost_price)
    FOR product_record IN (
        SELECT id, name, price, cost_price
        FROM products 
        WHERE active = true 
          AND cost_price IS NOT NULL 
          AND cost_price > 0
          AND price >= cost_price * 1.4  -- At least 40% markup
          AND price <= cost_price * 1.6  -- At most 60% markup
        ORDER BY ABS((price / cost_price) - 1.5)  -- Closest to 50% markup
        LIMIT 15
    ) LOOP
        -- Create 5-20 orders per product
        FOR i IN 1..(5 + floor(random() * 15)::int) LOOP
            order_id := gen_random_uuid();
            selected_user := user_ids[1 + floor(random() * 10)::int];
            quantity := 1 + floor(random() * 4)::int; -- 1 to 5 items
            order_date := NOW() - (random() * interval '7 days');
            
            -- Insert order
            INSERT INTO demo_orders (
                id, 
                order_number, 
                demo_user_id, 
                total_amount, 
                status, 
                created_at, 
                demo_type
            ) VALUES (
                order_id,
                'ORD-DEMO-' || LPAD(order_count::TEXT, 6, '0'),
                selected_user,
                product_record.price * quantity,
                'confirmed',
                order_date,
                'ranking'
            );
            
            -- Insert order item
            INSERT INTO demo_order_items (
                demo_order_id,
                product_id,
                quantity,
                unit_price,
                total_price
            ) VALUES (
                order_id,
                product_record.id,
                quantity,
                product_record.price,
                product_record.price * quantity
            );
            
            order_count := order_count + 1;
        END LOOP;
    END LOOP;
END $$;