-- Migration: New Product Ads Structure, Official Models, AI Variations and Audit History

-- 1. Expand ml_listing_variants to support Product Ads 1:N structure
ALTER TABLE public.ml_listing_variants 
  ADD COLUMN IF NOT EXISTS internal_name TEXT,
  ADD COLUMN IF NOT EXISTS origin_type TEXT DEFAULT 'reseller',
  ADD COLUMN IF NOT EXISTS origin_user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS origin_user_role TEXT,
  ADD COLUMN IF NOT EXISTS source_ad_id UUID REFERENCES public.ml_listing_variants(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_official_model BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS marketplace TEXT DEFAULT 'mercadolivre',
  ADD COLUMN IF NOT EXISTS promotional_price NUMERIC,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS bundle_quantity INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS gross_revenue NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_profit NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellations INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refunds INTEGER DEFAULT 0;

-- Fill internal_name with variant_title where internal_name is null
UPDATE public.ml_listing_variants 
SET internal_name = COALESCE(variant_title, 'Anúncio Anônimo')
WHERE internal_name IS NULL;

-- 2. Create ad_ai_generations table
CREATE TABLE IF NOT EXISTS public.ad_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  provider TEXT DEFAULT 'openai',
  model TEXT DEFAULT 'gpt-4o',
  objective TEXT,
  marketplace TEXT DEFAULT 'mercadolivre',
  requested_quantity INTEGER DEFAULT 3,
  selected_fields JSONB,
  source_ad_ids JSONB,
  prompt_version TEXT DEFAULT 'v1',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on ad_ai_generations
ALTER TABLE public.ad_ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI generations or admins view all" 
ON public.ad_ai_generations FOR SELECT 
USING (
  requested_by = auth.uid() 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Users can create AI generations" 
ON public.ad_ai_generations FOR INSERT 
WITH CHECK (requested_by = auth.uid());

-- 3. Create ad_entity_history table
CREATE TABLE IF NOT EXISTS public.ad_entity_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'product' or 'ad'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'price_change', 'stock_change', 'official_model_transformation', etc.
  previous_value JSONB,
  new_value JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_role TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on ad_entity_history
ALTER TABLE public.ad_entity_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view entity history for authorized items" 
ON public.ad_entity_history FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert entity history" 
ON public.ad_entity_history FOR INSERT 
TO authenticated 
WITH CHECK (user_id = auth.uid());

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_ml_variants_product_id ON public.ml_listing_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_ml_variants_official_model ON public.ml_listing_variants(is_official_model);
CREATE INDEX IF NOT EXISTS idx_ml_variants_origin_type ON public.ml_listing_variants(origin_type);
CREATE INDEX IF NOT EXISTS idx_ad_history_entity ON public.ad_entity_history(entity_type, entity_id);
