-- Create storage bucket for catalog images if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('catalog-images', 'catalog-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Policy: Anyone can view catalog images (public bucket)
CREATE POLICY "Public Read Catalog Images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'catalog-images');

-- Policy: Authenticated users can insert catalog images
CREATE POLICY "Authenticated Insert Catalog Images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'catalog-images' AND auth.role() = 'authenticated');

-- Policy: Service role can manage all catalog images
CREATE POLICY "Service Role Manage Catalog Images" 
ON storage.objects FOR ALL 
USING (bucket_id = 'catalog-images');
