-- Migration: Permitir que Fornecedores atualizem pedidos e sincronizar pipelines globais
-- 1. RLS: Fornecedores podem atualizar status de pedidos vinculados aos seus produtos ou fulfillment
-- 2. Garantir permissões de leitura pública/autenticada nas pipelines e etapas
-- 3. Garantir que apenas Super Admin / Admin gerenciem pipelines e etapas no banco

-- 1. Helper function is_super_admin com search_path seguro
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid()
    AND role::text IN ('super_admin', 'admin')
  );
$$;

-- 2. Permitir que fornecedores atualizem a tabela orders (para pedidos aos quais têm acesso)
DROP POLICY IF EXISTS "Suppliers can update orders assigned to them" ON public.orders;
CREATE POLICY "Suppliers can update orders assigned to them"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  public.has_supplier_access_to_order(auth.uid(), id) 
  OR public.is_admin_user()
)
WITH CHECK (
  public.has_supplier_access_to_order(auth.uid(), id) 
  OR public.is_admin_user()
);

-- 3. Garantir RLS em order_pipelines
ALTER TABLE public.order_pipelines ENABLE ROW LEVEL SECURITY;

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
WITH CHECK (public.is_super_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS "Only super_admin can update pipelines" ON public.order_pipelines;
CREATE POLICY "Only super_admin can update pipelines"
ON public.order_pipelines
FOR UPDATE
TO authenticated
USING (public.is_super_admin() OR public.is_admin_user())
WITH CHECK (public.is_super_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS "Only super_admin can delete pipelines" ON public.order_pipelines;
CREATE POLICY "Only super_admin can delete pipelines"
ON public.order_pipelines
FOR DELETE
TO authenticated
USING (public.is_super_admin() OR public.is_admin_user());

-- 4. Garantir RLS em order_pipeline_stages
ALTER TABLE public.order_pipeline_stages ENABLE ROW LEVEL SECURITY;

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
WITH CHECK (public.is_super_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS "Only super_admin can update stages" ON public.order_pipeline_stages;
CREATE POLICY "Only super_admin can update stages"
ON public.order_pipeline_stages
FOR UPDATE
TO authenticated
USING (public.is_super_admin() OR public.is_admin_user())
WITH CHECK (public.is_super_admin() OR public.is_admin_user());

DROP POLICY IF EXISTS "Only super_admin can delete stages" ON public.order_pipeline_stages;
CREATE POLICY "Only super_admin can delete stages"
ON public.order_pipeline_stages
FOR DELETE
TO authenticated
USING (public.is_super_admin() OR public.is_admin_user());

-- 5. Seed inicial se tabelas estiverem vazias
INSERT INTO public.order_pipelines (id, key, name, description, order_index, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'primary', 'Pipeline Principal', 'Fluxo normal de processamento e envio de pedidos', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'occurrences', 'Retornos e Ocorrências', 'Gestão de pós-venda, devoluções, trocas e ocorrências', 2, true)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, order_index = EXCLUDED.order_index;

INSERT INTO public.order_pipeline_stages (id, pipeline_id, name, status_key, order_index, icon_name, color_class)
VALUES
  ('stage-p1', '11111111-1111-1111-1111-111111111111', 'Novo Pedido', 'pendente', 1, 'Clock', 'bg-gray-100 text-gray-800 border-gray-300'),
  ('stage-p2', '11111111-1111-1111-1111-111111111111', 'Pedido Pago > Aguardando Recebimento da Expedição', 'pago', 2, 'BadgeCheck', 'bg-emerald-100 text-emerald-800 border-emerald-300'),
  ('stage-p3', '11111111-1111-1111-1111-111111111111', 'Pedido Recebido > Aguardando Envio', 'recebido', 3, 'Inbox', 'bg-blue-100 text-blue-800 border-blue-300'),
  ('stage-p4', '11111111-1111-1111-1111-111111111111', 'Embalado > Aguardando Envio', 'embalado', 4, 'Package', 'bg-orange-100 text-orange-800 border-orange-300'),
  ('stage-p5', '11111111-1111-1111-1111-111111111111', 'Pedido Enviado', 'enviado', 5, 'Send', 'bg-purple-100 text-purple-800 border-purple-300'),
  ('stage-p6', '11111111-1111-1111-1111-111111111111', 'Finalizado', 'finalizado', 6, 'CheckCircle2', 'bg-green-100 text-green-800 border-green-300'),
  ('stage-p7', '11111111-1111-1111-1111-111111111111', 'Cancelado', 'cancelado', 7, 'XCircle', 'bg-gray-200 text-gray-600 border-gray-400'),
  ('stage-p8', '11111111-1111-1111-1111-111111111111', 'Erro | Etiqueta Incorreta', 'etiqueta_incorreta', 8, 'AlertTriangle', 'bg-rose-100 text-rose-800 border-rose-300')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.order_pipeline_stages (id, pipeline_id, name, status_key, order_index, icon_name, color_class)
VALUES
  ('stage-o1', '22222222-2222-2222-2222-222222222222', 'Ocorrência Aberta', 'aberto', 1, 'AlertCircle', 'bg-red-100 text-red-800 border-red-300'),
  ('stage-o2', '22222222-2222-2222-2222-222222222222', 'Em Análise', 'em_analise', 2, 'Search', 'bg-amber-100 text-amber-800 border-amber-300'),
  ('stage-o3', '22222222-2222-2222-2222-222222222222', 'Aguardando Cliente', 'aguardando_cliente', 3, 'Clock', 'bg-blue-100 text-blue-800 border-blue-300'),
  ('stage-o4', '22222222-2222-2222-2222-222222222222', 'Resolvido', 'resolvido', 4, 'CheckCircle2', 'bg-green-100 text-green-800 border-green-300'),
  ('stage-o5', '22222222-2222-2222-2222-222222222222', 'Cancelado', 'cancelado', 5, 'XCircle', 'bg-gray-200 text-gray-600 border-gray-300')
ON CONFLICT (id) DO NOTHING;
