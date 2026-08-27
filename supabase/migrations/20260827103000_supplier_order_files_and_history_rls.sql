-- Migration: Enable suppliers to view & manage shipping files, status history and refund documents

-- 1. Helper function to verify supplier access to an order (supporting both fulfillments org members & direct product supplier_id)
CREATE OR REPLACE FUNCTION public.has_supplier_access_to_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS \$\$
  SELECT EXISTS (
    SELECT 1
    FROM public.supplier_fulfillments sf
    JOIN public.supplier_organization_members som ON som.organization_id = sf.supplier_organization_id
    WHERE sf.order_id = _order_id
      AND som.user_id = _user_id
  ) OR EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = _order_id
      AND p.supplier_id = _user_id
  );
\$\$;

-- 2. RLS Policies for order_shipping_files
DROP POLICY IF EXISTS "Suppliers can view shipping files of their orders" ON public.order_shipping_files;
CREATE POLICY "Suppliers can view shipping files of their orders"
ON public.order_shipping_files
FOR SELECT
TO authenticated
USING (public.has_supplier_access_to_order(auth.uid(), order_id));

DROP POLICY IF EXISTS "Suppliers can insert shipping files for their orders" ON public.order_shipping_files;
CREATE POLICY "Suppliers can insert shipping files for their orders"
ON public.order_shipping_files
FOR INSERT
TO authenticated
WITH CHECK (public.has_supplier_access_to_order(auth.uid(), order_id));

DROP POLICY IF EXISTS "Suppliers can delete shipping files of their orders" ON public.order_shipping_files;
CREATE POLICY "Suppliers can delete shipping files of their orders"
ON public.order_shipping_files
FOR DELETE
TO authenticated
USING (public.has_supplier_access_to_order(auth.uid(), order_id));

-- 3. RLS Policies for order_refund_documents
DROP POLICY IF EXISTS "Suppliers can view refund documents of their orders" ON public.order_refund_documents;
CREATE POLICY "Suppliers can view refund documents of their orders"
ON public.order_refund_documents
FOR SELECT
TO authenticated
USING (public.has_supplier_access_to_order(auth.uid(), order_id));

-- 4. RLS Policies for order_status_history
DROP POLICY IF EXISTS "Suppliers can view status history of their orders" ON public.order_status_history;
CREATE POLICY "Suppliers can view status history of their orders"
ON public.order_status_history
FOR SELECT
TO authenticated
USING (public.has_supplier_access_to_order(auth.uid(), order_id));

DROP POLICY IF EXISTS "Suppliers can insert order status history" ON public.order_status_history;
CREATE POLICY "Suppliers can insert order status history"
ON public.order_status_history
FOR INSERT
TO authenticated
WITH CHECK (public.has_supplier_access_to_order(auth.uid(), order_id));

-- 5. Storage Policies for shipping-files, shipping-labels, and refund-documents buckets
DROP POLICY IF EXISTS "Suppliers can view shipping files for their orders" ON storage.objects;
CREATE POLICY "Suppliers can view shipping files for their orders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  (bucket_id IN ('shipping-files', 'shipping-labels', 'refund-documents'))
  AND (
    public.is_admin_user()
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.has_supplier_access_to_order(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE (o.user_id = auth.uid() OR o.reseller_id = auth.uid())
        AND o.id::text = (storage.foldername(name))[1]
    )
  )
);

DROP POLICY IF EXISTS "Suppliers can upload shipping files for their orders" ON storage.objects;
CREATE POLICY "Suppliers can upload shipping files for their orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  (bucket_id IN ('shipping-files', 'shipping-labels'))
  AND (
    public.is_admin_user()
    OR (
      (storage.foldername(name))[1] ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      AND public.has_supplier_access_to_order(auth.uid(), (storage.foldername(name))[1]::uuid)
    )
    OR EXISTS (
      SELECT 1 FROM public.orders o
      WHERE (o.user_id = auth.uid() OR o.reseller_id = auth.uid())
        AND o.id::text = (storage.foldername(name))[1]
    )
  )
);
