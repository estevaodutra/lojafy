-- Allow suppliers to view order_items for orders they have access to or items belonging to their organization
DROP POLICY IF EXISTS "Suppliers can view order items of their orders" ON public.order_items;
CREATE POLICY "Suppliers can view order items of their orders"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    public.has_supplier_access_to_order(auth.uid(), order_id)
    OR supplier_id = auth.uid()
    OR (supplier_organization_id IS NOT NULL AND public.is_supplier_org_member(supplier_organization_id, auth.uid()))
  );
