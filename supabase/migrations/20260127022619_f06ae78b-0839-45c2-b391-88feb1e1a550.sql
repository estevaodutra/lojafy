-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-ticket-attachments', 'order-ticket-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload ticket attachments
CREATE POLICY "Users can upload ticket attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'order-ticket-attachments');

-- Policy: Anyone can view ticket attachments (public bucket)
CREATE POLICY "Ticket attachments are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'order-ticket-attachments');

-- Policy: Users can delete their own uploads
CREATE POLICY "Users can delete own ticket attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'order-ticket-attachments' AND (auth.uid())::text = (storage.foldername(name))[1]);