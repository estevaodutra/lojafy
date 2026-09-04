-- Migration: Add SKU and GTIN columns to ml_listing_variants for Product Ads duplication
ALTER TABLE public.ml_listing_variants 
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS gtin TEXT;

-- Create index on sku for fast searching
CREATE INDEX IF NOT EXISTS idx_ml_variants_sku ON public.ml_listing_variants(sku);
