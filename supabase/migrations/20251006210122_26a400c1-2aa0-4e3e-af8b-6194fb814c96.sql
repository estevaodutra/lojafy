-- Create order_refund_documents table
CREATE TABLE IF NOT EXISTS public.order_refund_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size integer NOT NULL,
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_order_refund_documents_order_id ON public.order_refund_documents(order_id);

-- Enable RLS
ALTER TABLE public.order_refund_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can manage all refund documents
CREATE POLICY "Admins can manage refund documents"
ON public.order_refund_documents
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- RLS Policy: Users can view refund documents for their own orders
CREATE POLICY "Users can view their order refund documents"
ON public.order_refund_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_refund_documents.order_id
    AND orders.user_id = auth.uid()
  )
);

-- Create storage bucket for refund documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('refund-documents', 'refund-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policy: Admins can manage refund documents
CREATE POLICY "Admins can manage refund documents in storage"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'refund-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Storage RLS Policy: Users can view their own refund documents
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