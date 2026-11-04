-- Migration: Order Pipelines and Stages Configuration
-- Only super_admin can configure/manage pipelines and stages
-- Authenticated users (admin, super_admin, supplier, reseller) can view active pipelines

CREATE TABLE IF NOT EXISTS public.order_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.order_pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status_key TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  color_class TEXT,
  icon_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_pipeline_stages_pipeline ON public.order_pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_order_pipeline_stages_status ON public.order_pipeline_stages(status_key);

-- Enable RLS
ALTER TABLE public.order_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'super_admin'
  );
$$;

-- RLS for order_pipelines
DROP POLICY IF EXISTS "Anyone authenticated can view active pipelines" ON public.order_pipelines;
CREATE POLICY "Anyone authenticated can view active pipelines"
  ON public.order_pipelines
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can insert pipelines" ON public.order_pipelines;
CREATE POLICY "Only super_admin can insert pipelines"
  ON public.order_pipelines
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Only super_admin can update pipelines" ON public.order_pipelines;
CREATE POLICY "Only super_admin can update pipelines"
  ON public.order_pipelines
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Only super_admin can delete pipelines" ON public.order_pipelines;
CREATE POLICY "Only super_admin can delete pipelines"
  ON public.order_pipelines
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- RLS for order_pipeline_stages
DROP POLICY IF EXISTS "Anyone authenticated can view stages" ON public.order_pipeline_stages;
CREATE POLICY "Anyone authenticated can view stages"
  ON public.order_pipeline_stages
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only super_admin can insert stages" ON public.order_pipeline_stages;
CREATE POLICY "Only super_admin can insert stages"
  ON public.order_pipeline_stages
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Only super_admin can update stages" ON public.order_pipeline_stages;
CREATE POLICY "Only super_admin can update stages"
  ON public.order_pipeline_stages
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Only super_admin can delete stages" ON public.order_pipeline_stages;
CREATE POLICY "Only super_admin can delete stages"
  ON public.order_pipeline_stages
  FOR DELETE
  TO authenticated
  USING (public.is_super_admin());

-- Seed default pipelines
INSERT INTO public.order_pipelines (id, key, name, description, order_index, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'primary', 'Pipeline Principal', 'Fluxo normal de processamento e envio de pedidos', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'occurrences', 'Retornos e Ocorrências', 'Gestão de pós-venda, devoluções, trocas e ocorrências', 2, true)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, order_index = EXCLUDED.order_index;

-- Seed default stages for primary pipeline
INSERT INTO public.order_pipeline_stages (pipeline_id, name, status_key, order_index, icon_name, color_class)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Pedido Gerado > Aguardando Pagamento', 'pendente', 1, 'Clock', 'bg-gray-100 text-gray-800 border-gray-300'),
  ('11111111-1111-1111-1111-111111111111', 'Pedido Pago > Aguardando Recebimento da Expedição', 'pago', 2, 'BadgeCheck', 'bg-emerald-100 text-emerald-800 border-emerald-300'),
  ('11111111-1111-1111-1111-111111111111', 'Pedido Recebido > Aguardando Envio', 'recebido', 3, 'Inbox', 'bg-blue-100 text-blue-800 border-blue-300'),
  ('11111111-1111-1111-1111-111111111111', 'Embalado > Aguardando Envio', 'embalado', 4, 'Package', 'bg-orange-100 text-orange-800 border-orange-300'),
  ('11111111-1111-1111-1111-111111111111', 'Pedido Enviado', 'enviado', 5, 'Send', 'bg-purple-100 text-purple-800 border-purple-300'),
  ('11111111-1111-1111-1111-111111111111', 'Finalizado', 'finalizado', 6, 'CheckCircle2', 'bg-green-100 text-green-800 border-green-300'),
  ('11111111-1111-1111-1111-111111111111', 'Cancelado', 'cancelado', 7, 'XCircle', 'bg-gray-200 text-gray-600 border-gray-400'),
  ('11111111-1111-1111-1111-111111111111', 'Erro | Etiqueta Incorreta', 'etiqueta_incorreta', 8, 'AlertTriangle', 'bg-rose-100 text-rose-800 border-rose-300')
ON CONFLICT DO NOTHING;

-- Seed default stages for occurrences pipeline
INSERT INTO public.order_pipeline_stages (pipeline_id, name, status_key, order_index, icon_name, color_class)
VALUES
  ('22222222-2222-2222-2222-222222222222', 'Ocorrência Aberta', 'aberto', 1, 'AlertCircle', 'bg-red-100 text-red-800 border-red-300'),
  ('22222222-2222-2222-2222-222222222222', 'Em Análise', 'em_analise', 2, 'Search', 'bg-amber-100 text-amber-800 border-amber-300'),
  ('22222222-2222-2222-2222-222222222222', 'Aguardando Cliente', 'aguardando_cliente', 3, 'Clock', 'bg-blue-100 text-blue-800 border-blue-300'),
  ('22222222-2222-2222-2222-222222222222', 'Resolvido', 'resolvido', 4, 'CheckCircle2', 'bg-green-100 text-green-800 border-green-300'),
  ('22222222-2222-2222-2222-222222222222', 'Cancelado', 'cancelado', 5, 'XCircle', 'bg-gray-200 text-gray-600 border-gray-300')
ON CONFLICT DO NOTHING;
