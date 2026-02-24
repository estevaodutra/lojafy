
-- ============================================
-- 1. Tabela: plans
-- ============================================
CREATE TABLE public.plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  descricao TEXT,
  preco_mensal DECIMAL(10,2) DEFAULT 0,
  preco_anual DECIMAL(10,2) DEFAULT 0,
  preco_vitalicio DECIMAL(10,2) DEFAULT 0,
  cor VARCHAR DEFAULT '#6366f1',
  icone VARCHAR DEFAULT 'star',
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (true);

CREATE POLICY "Only super_admin can insert plans"
  ON public.plans FOR INSERT
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "Only super_admin can update plans"
  ON public.plans FOR UPDATE
  USING (public.has_role('super_admin'));

CREATE POLICY "Only super_admin can delete plans"
  ON public.plans FOR DELETE
  USING (public.has_role('super_admin'));

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. Tabela: plan_features
-- ============================================
CREATE TABLE public.plan_features (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  limites JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(plan_id, feature_id)
);

ALTER TABLE public.plan_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plan features are viewable by everyone"
  ON public.plan_features FOR SELECT
  USING (true);

CREATE POLICY "Only super_admin can insert plan_features"
  ON public.plan_features FOR INSERT
  WITH CHECK (public.has_role('super_admin'));

CREATE POLICY "Only super_admin can update plan_features"
  ON public.plan_features FOR UPDATE
  USING (public.has_role('super_admin'));

CREATE POLICY "Only super_admin can delete plan_features"
  ON public.plan_features FOR DELETE
  USING (public.has_role('super_admin'));

-- ============================================
-- 3. Alteração em profiles
-- ============================================
ALTER TABLE public.profiles
  ADD COLUMN plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  ADD COLUMN plan_started_at TIMESTAMPTZ,
  ADD COLUMN plan_expires_at TIMESTAMPTZ,
  ADD COLUMN plan_type VARCHAR;

-- ============================================
-- 4. Funções auxiliares
-- ============================================
CREATE OR REPLACE FUNCTION public.get_plan_feature_count(_plan_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.plan_features
  WHERE plan_id = _plan_id;
$$;

CREATE OR REPLACE FUNCTION public.get_plan_user_count(_plan_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.profiles
  WHERE plan_id = _plan_id AND is_active = true;
$$;
