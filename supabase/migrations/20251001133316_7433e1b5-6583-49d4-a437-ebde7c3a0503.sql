-- Drop existing restrictive policies for order_shipping_files
DROP POLICY IF EXISTS "Users can insert shipping files for their orders" ON public.order_shipping_files;
DROP POLICY IF EXISTS "Admins can insert shipping files records" ON public.order_shipping_files;
DROP POLICY IF EXISTS "Users can view their own shipping files" ON public.order_shipping_files;
DROP POLICY IF EXISTS "Admins can view all shipping files" ON public.order_shipping_files;

-- Create new permissive policies for order_shipping_files table
CREATE POLICY "Authenticated users can insert shipping files"
ON public.order_shipping_files
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view shipping files"
ON public.order_shipping_files
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage all shipping files"
ON public.order_shipping_files
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Drop existing restrictive policies for shipping-files bucket
DROP POLICY IF EXISTS "Users can view their own shipping files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own shipping files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own shipping files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all shipping files" ON storage.objects;

-- Create new permissive policies for shipping-files storage bucket
CREATE POLICY "Authenticated users can upload shipping files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'shipping-files');

CREATE POLICY "Authenticated users can view shipping files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'shipping-files');

CREATE POLICY "Authenticated users can update shipping files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'shipping-files');

CREATE POLICY "Authenticated users can delete shipping files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'shipping-files');