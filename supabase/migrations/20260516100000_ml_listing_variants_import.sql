-- Permite armazenar anúncios ML não vinculados ao catálogo
ALTER TABLE public.ml_listing_variants ALTER COLUMN product_id DROP NOT NULL;
ALTER TABLE public.ml_listing_variants ADD COLUMN IF NOT EXISTS thumbnail TEXT;
ALTER TABLE public.ml_listing_variants ADD COLUMN IF NOT EXISTS category_id TEXT;
