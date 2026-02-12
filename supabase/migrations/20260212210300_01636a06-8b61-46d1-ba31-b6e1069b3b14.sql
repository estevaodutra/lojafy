-- Allow admins/super_admins to insert into order_status_history
CREATE POLICY "Admins can insert order status history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

-- Also allow suppliers who have access to the order
CREATE POLICY "Suppliers can insert order status history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_supplier_access_to_order(auth.uid(), order_id));