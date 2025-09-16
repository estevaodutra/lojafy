-- Create demo tables for ranking data isolation

-- Demo users table for fake user data
CREATE TABLE public.demo_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Demo orders table
CREATE TABLE public.demo_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_user_id uuid NOT NULL REFERENCES demo_users(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed',
  total_amount numeric NOT NULL,
  shipping_amount numeric DEFAULT 0,
  tax_amount numeric DEFAULT 0,
  demo_type text NOT NULL DEFAULT 'ranking',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Demo order items table
CREATE TABLE public.demo_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  demo_order_id uuid NOT NULL REFERENCES demo_orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total_price numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on demo tables
ALTER TABLE public.demo_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for demo tables - anyone can view for ranking purposes
CREATE POLICY "Anyone can view demo users for ranking" 
ON public.demo_users FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view demo orders for ranking" 
ON public.demo_orders FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view demo order items for ranking" 
ON public.demo_order_items FOR SELECT 
USING (true);

-- Admin policies for managing demo data
CREATE POLICY "Admins can manage demo users" 
ON public.demo_users FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Admins can manage demo orders" 
ON public.demo_orders FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Admins can manage demo order items" 
ON public.demo_order_items FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

-- Create indexes for better performance
CREATE INDEX idx_demo_orders_created_at ON demo_orders(created_at);
CREATE INDEX idx_demo_orders_status ON demo_orders(status);
CREATE INDEX idx_demo_order_items_product_id ON demo_order_items(product_id);
CREATE INDEX idx_demo_order_items_demo_order_id ON demo_order_items(demo_order_id);

-- Insert sample demo users
INSERT INTO demo_users (first_name, last_name, email) VALUES
('João', 'Silva', 'joao.silva@email.com'),
('Maria', 'Santos', 'maria.santos@email.com'),
('Pedro', 'Oliveira', 'pedro.oliveira@email.com'),
('Ana', 'Costa', 'ana.costa@email.com'),
('Carlos', 'Ferreira', 'carlos.ferreira@email.com'),
('Lucia', 'Almeida', 'lucia.almeida@email.com'),
('Bruno', 'Lima', 'bruno.lima@email.com'),
('Camila', 'Rodrigues', 'camila.rodrigues@email.com'),
('Rafael', 'Pereira', 'rafael.pereira@email.com'),
('Juliana', 'Martins', 'juliana.martins@email.com');

-- Populate demo ranking data with products having 20-35% profit margin
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
top_products AS (
  SELECT 
    mp.*,
    ROW_NUMBER() OVER (ORDER BY margin_percent DESC) as position,
    CASE ROW_NUMBER() OVER (ORDER BY margin_percent DESC)
      WHEN 1 THEN 45  
      WHEN 2 THEN 32   
      WHEN 3 THEN 25  
      WHEN 4 THEN 19  
      WHEN 5 THEN 15  
      WHEN 6 THEN 12  
      WHEN 7 THEN 9   
      WHEN 8 THEN 7   
      WHEN 9 THEN 5   
      ELSE 3          
    END as target_sales
  FROM margin_products mp
),
demo_users_sample AS (
  SELECT id FROM demo_users ORDER BY random() LIMIT 1
)
-- Insert demo orders
INSERT INTO demo_orders (demo_user_id, order_number, status, total_amount, shipping_amount, tax_amount, demo_type, created_at)
SELECT 
  dus.id,
  'DEMO-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
  'confirmed',
  tp.price * quantity_info.qty,
  0,
  0,
  'ranking',
  now() - (random() * interval '7 days')
FROM top_products tp
CROSS JOIN demo_users_sample dus
CROSS JOIN generate_series(1, tp.target_sales) as sales_num(num)
CROSS JOIN LATERAL (
  SELECT (1 + floor(random() * 2))::int as qty
) quantity_info;

-- Insert demo order items for the orders we just created
WITH demo_orders_created AS (
  SELECT 
    do.id as demo_order_id,
    do.total_amount,
    do.created_at,
    (random() * 9 + 1)::int as random_product_idx
  FROM demo_orders do
  WHERE do.demo_type = 'ranking'
    AND do.created_at >= now() - interval '8 days'
),
available_products AS (
  SELECT 
    id, 
    price,
    ROW_NUMBER() OVER (ORDER BY ((price - COALESCE(cost_price, 0)) / price * 100) DESC) as product_rank
  FROM products
  WHERE active = true
    AND cost_price IS NOT NULL
    AND ((price - cost_price) / price * 100) BETWEEN 20 AND 35
  LIMIT 10
)
INSERT INTO demo_order_items (demo_order_id, product_id, quantity, unit_price, total_price, created_at)
SELECT 
  doc.demo_order_id,
  ap.id,
  CASE 
    WHEN doc.total_amount >= ap.price * 1.8 THEN 2 
    ELSE 1 
  END as quantity,
  ap.price,
  doc.total_amount,
  doc.created_at
FROM demo_orders_created doc
JOIN available_products ap ON ap.product_rank = (doc.random_product_idx % 10) + 1;