-- Restore storage policies on storage.objects

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Clean up any existing policies on storage.objects to avoid duplicates
DROP POLICY IF EXISTS "Admins can upload shipping files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view shipping files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update shipping files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete shipping files" ON storage.objects;

DROP POLICY IF EXISTS "Users can upload shipping files for their orders" ON storage.objects;
DROP POLICY IF EXISTS "Users can view shipping files for their orders" ON storage.objects;
DROP POLICY IF EXISTS "Resellers can upload shipping files for their orders" ON storage.objects;
DROP POLICY IF EXISTS "Resellers can view shipping files for their orders" ON storage.objects;

DROP POLICY IF EXISTS "Admins can manage refund documents in storage" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their refund documents in storage" ON storage.objects;

-- 1. Admins: full access to shipping-files
CREATE POLICY "Admins can upload shipping files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shipping-files'
  AND public.is_admin_user()
);

CREATE POLICY "Admins can view shipping files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shipping-files'
  AND public.is_admin_user()
);

CREATE POLICY "Admins can update shipping files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'shipping-files'
  AND public.is_admin_user()
)
WITH CHECK (
  bucket_id = 'shipping-files'
  AND public.is_admin_user()
);

CREATE POLICY "Admins can delete shipping files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'shipping-files'
  AND public.is_admin_user()
);

-- 2. Users (Customers/Owners): upload and view shipping-files matching their user_id
CREATE POLICY "Users can upload shipping files for their orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shipping-files'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Users can view shipping files for their orders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shipping-files'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.user_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[1]
  )
);

-- 3. Resellers: upload and view shipping-files matching their reseller_id
CREATE POLICY "Resellers can upload shipping files for their orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shipping-files'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.reseller_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Resellers can view shipping files for their orders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shipping-files'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.reseller_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[1]
  )
);

-- 4. Admins: manage refund-documents
CREATE POLICY "Admins can manage refund documents in storage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'refund-documents' AND
  public.is_admin_user()
)
WITH CHECK (
  bucket_id = 'refund-documents' AND
  public.is_admin_user()
);

-- 5. Users: view refund-documents for their orders
CREATE POLICY "Users can view their refund documents in storage"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'refund-documents' AND
  EXISTS (
    SELECT 1 FROM public.order_refund_documents ord
    JOIN public.orders o ON o.id = ord.order_id
    WHERE ord.file_path = name
    AND o.user_id = auth.uid()
  )
);
