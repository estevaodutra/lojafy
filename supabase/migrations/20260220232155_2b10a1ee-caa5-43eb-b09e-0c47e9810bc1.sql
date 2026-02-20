
-- Adicionar colunas na tabela features
ALTER TABLE public.features ADD COLUMN IF NOT EXISTS gerencia_produtos boolean DEFAULT false;
ALTER TABLE public.features ADD COLUMN IF NOT EXISTS limite_produtos integer;

-- Criar tabela feature_produtos
CREATE TABLE public.feature_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feature_produtos_unique UNIQUE(feature_id, produto_id)
);

-- Indices
CREATE INDEX idx_feature_produtos_feature_id ON public.feature_produtos(feature_id);
CREATE INDEX idx_feature_produtos_produto_id ON public.feature_produtos(produto_id);

-- Enable RLS
ALTER TABLE public.feature_produtos ENABLE ROW LEVEL SECURITY;

-- RLS policies - apenas admin
CREATE POLICY "Admins can select feature_produtos"
ON public.feature_produtos FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Admins can insert feature_produtos"
ON public.feature_produtos FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update feature_produtos"
ON public.feature_produtos FOR UPDATE
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "Admins can delete feature_produtos"
ON public.feature_produtos FOR DELETE
TO authenticated
USING (public.is_admin_user());
