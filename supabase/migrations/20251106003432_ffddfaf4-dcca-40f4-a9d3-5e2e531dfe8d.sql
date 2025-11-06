-- Fix duplicate and conflicting RLS policies

-- 1. Fix orders policies - Remove admin logic from supplier policy
DROP POLICY IF EXISTS "Suppliers can view orders with their products" ON orders;

CREATE POLICY "Suppliers can view orders with their products"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = orders.id 
        AND p.supplier_id = auth.uid()
    )
  );

-- 2. Consolidate products policies - Remove duplicates
DROP POLICY IF EXISTS "Suppliers can view their own products" ON products;
DROP POLICY IF EXISTS "Suppliers can view pending products assigned to them" ON products;

CREATE POLICY "Suppliers can view their products"
  ON products FOR SELECT
  USING (
    supplier_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- 3. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);