-- Add reference_ad_url column to products table
ALTER TABLE public.products
ADD COLUMN reference_ad_url TEXT;

COMMENT ON COLUMN public.products.reference_ad_url IS 'URL do anúncio de referência externo onde o produto está mais barato. Quando preenchido, o produto é automaticamente marcado como destaque.';