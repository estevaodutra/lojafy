-- Create table for reseller store pages content
CREATE TABLE IF NOT EXISTS public.reseller_store_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL,
  page_type TEXT NOT NULL CHECK (page_type IN ('about', 'faq')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reseller_id, page_type)
);

-- Enable RLS
ALTER TABLE public.reseller_store_pages ENABLE ROW LEVEL SECURITY;

-- Policy: Resellers can manage their own pages
CREATE POLICY "Resellers can manage their own pages"
ON public.reseller_store_pages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'reseller'
    AND profiles.user_id = reseller_store_pages.reseller_id
  )
);

-- Policy: Anyone can view active pages from active stores
CREATE POLICY "Anyone can view active pages from active stores"
ON public.reseller_store_pages
FOR SELECT
USING (
  active = true
  AND EXISTS (
    SELECT 1 FROM reseller_stores
    WHERE reseller_stores.reseller_id = reseller_store_pages.reseller_id
    AND reseller_stores.active = true
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_reseller_store_pages_updated_at
BEFORE UPDATE ON public.reseller_store_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_reseller_store_pages_reseller_id ON public.reseller_store_pages(reseller_id);
CREATE INDEX idx_reseller_store_pages_page_type ON public.reseller_store_pages(page_type);