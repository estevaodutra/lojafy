-- Tabela para múltiplas versões (variantes A/B) de anúncios ML
CREATE TABLE IF NOT EXISTS public.ml_listing_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ml_item_id TEXT,
  variant_title TEXT NOT NULL,
  variant_description TEXT,
  price DECIMAL(10,2),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'paused', 'closed')),
  permalink TEXT,
  visits INTEGER DEFAULT 0,
  sales INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ml_listing_variants_user ON public.ml_listing_variants(user_id);
CREATE INDEX IF NOT EXISTS idx_ml_listing_variants_product ON public.ml_listing_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_ml_listing_variants_ml_item ON public.ml_listing_variants(ml_item_id) WHERE ml_item_id IS NOT NULL;

ALTER TABLE public.ml_listing_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own variants"
  ON public.ml_listing_variants FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all variants"
  ON public.ml_listing_variants FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role = 'super_admin'
  ));
