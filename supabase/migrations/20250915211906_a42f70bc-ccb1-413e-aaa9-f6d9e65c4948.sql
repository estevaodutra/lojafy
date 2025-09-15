-- Storage policies for 'shipping-files' bucket
-- Users: can INSERT/SELECT files where the first folder equals an order they own
-- Admins: can INSERT/SELECT any file in 'shipping-files'

-- Users can upload shipping files for their orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload shipping files for their orders'
  ) THEN
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
  END IF;
END $$;

-- Users can view shipping files for their orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can view shipping files for their orders'
  ) THEN
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
  END IF;
END $$;

-- Admins can upload shipping files for any order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can upload shipping files'
  ) THEN
    CREATE POLICY "Admins can upload shipping files"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'shipping-files'
      AND public.is_admin_user()
    );
  END IF;
END $$;

-- Admins can view shipping files for any order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Admins can view shipping files'
  ) THEN
    CREATE POLICY "Admins can view shipping files"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'shipping-files'
      AND public.is_admin_user()
    );
  END IF;
END $$;

-- order_shipping_files: Add INSERT for admins
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'order_shipping_files' 
      AND policyname = 'Admins can insert shipping files records'
  ) THEN
    CREATE POLICY "Admins can insert shipping files records"
    ON public.order_shipping_files
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin_user());
  END IF;
END $$;