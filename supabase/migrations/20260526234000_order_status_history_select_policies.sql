-- Allow admins/super_admins to select from order_status_history
DROP POLICY IF EXISTS "Admins can view all status history" ON public.order_status_history;
CREATE POLICY "Admins can view all status history"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- Also allow suppliers who have access to the order
DROP POLICY IF EXISTS "Suppliers can view status history of their orders" ON public.order_status_history;
CREATE POLICY "Suppliers can view status history of their orders"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (public.has_supplier_access_to_order(auth.uid(), order_id));
