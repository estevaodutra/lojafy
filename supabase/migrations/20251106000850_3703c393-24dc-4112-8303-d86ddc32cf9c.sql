-- ============================================
-- FASE 1: RLS Policies para Supplier
-- ============================================

-- Políticas para suppliers gerenciarem seus próprios produtos
CREATE POLICY "Suppliers can view their own products"
  ON products FOR SELECT
  USING (
    supplier_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

CREATE POLICY "Suppliers can insert their own products"
  ON products FOR INSERT
  WITH CHECK (supplier_id = auth.uid());

CREATE POLICY "Suppliers can update their own products"
  ON products FOR UPDATE
  USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers can delete their own products"
  ON products FOR DELETE
  USING (supplier_id = auth.uid());

-- Políticas para suppliers verem pedidos que contêm seus produtos
CREATE POLICY "Suppliers can view orders with their products"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = orders.id 
        AND p.supplier_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );

-- Políticas para suppliers verem seus order_items
CREATE POLICY "Suppliers can view their order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products p
      WHERE p.id = order_items.product_id 
        AND p.supplier_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
    )
  );