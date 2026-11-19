-- Migration: Fix canonical pipeline stage names permanently
-- Eliminates "Novo Pedido" and old verbose status names from pipeline tables.

-- 1. Ensure pipelines exist
INSERT INTO public.order_pipelines (id, key, name, description, order_index, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'primary', 'Pipeline Principal', 'Fluxo normal de processamento e envio de pedidos', 1, true),
  ('22222222-2222-2222-2222-222222222222', 'occurrences', 'Ocorrências', 'Gestão de pós-venda, devoluções, trocas e ocorrências', 2, true)
ON CONFLICT (key) DO UPDATE
SET name = EXCLUDED.name, description = EXCLUDED.description, order_index = EXCLUDED.order_index;

-- 2. Limpar etapas legadas ou duplicadas de nomes incorretos na pipeline principal
DELETE FROM public.order_pipeline_stages
WHERE pipeline_id = '11111111-1111-1111-1111-111111111111'
  AND name IN ('Novo Pedido', 'Pedido Pago > Aguardando Recebimento da Expedição', 'Pedido Recebido > Aguardando Envio');

-- 3. Inserir ou atualizar com os nomes canônicos exatos da Pipeline Principal
INSERT INTO public.order_pipeline_stages (id, pipeline_id, name, status_key, order_index, icon_name, color_class, is_active)
VALUES
  ('stage-p1', '11111111-1111-1111-1111-111111111111', 'Pedido Pago', 'pago', 1, 'BadgeCheck', 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800', true),
  ('stage-p2', '11111111-1111-1111-1111-111111111111', 'Ag Liberação de Etiqueta', 'ag_liberacao_etiqueta', 2, 'Clock', 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', true),
  ('stage-p3', '11111111-1111-1111-1111-111111111111', 'Pedido Recebido', 'recebido', 3, 'Inbox', 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800', true),
  ('stage-p4', '11111111-1111-1111-1111-111111111111', 'Embalado > Aguardando Envio', 'embalado', 4, 'Package', 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', true),
  ('stage-p5', '11111111-1111-1111-1111-111111111111', 'Pedido Enviado', 'enviado', 5, 'Send', 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800', true),
  ('stage-p6', '11111111-1111-1111-1111-111111111111', 'Finalizado', 'finalizado', 6, 'CheckCircle2', 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800', true),
  ('stage-p7', '11111111-1111-1111-1111-111111111111', 'Cancelado', 'cancelado', 7, 'XCircle', 'bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800', true),
  ('stage-p8', '11111111-1111-1111-1111-111111111111', 'Erro | Etiqueta Incorreta', 'etiqueta_incorreta', 8, 'AlertTriangle', 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800', true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status_key = EXCLUDED.status_key,
  order_index = EXCLUDED.order_index,
  icon_name = EXCLUDED.icon_name,
  color_class = EXCLUDED.color_class,
  is_active = EXCLUDED.is_active;

-- 4. Inserir ou atualizar etapas canônicas da Pipeline de Ocorrências
INSERT INTO public.order_pipeline_stages (id, pipeline_id, name, status_key, order_index, icon_name, color_class, is_active)
VALUES
  ('stage-o1', '22222222-2222-2222-2222-222222222222', 'Nova Ocorrência', 'nova_ocorrencia', 1, 'AlertCircle', 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800', true),
  ('stage-o2', '22222222-2222-2222-2222-222222222222', 'Produto Enviado', 'produto_enviado', 2, 'Send', 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800', true),
  ('stage-o3', '22222222-2222-2222-2222-222222222222', 'Entrega Hoje', 'entrega_hoje', 3, 'Truck', 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', true),
  ('stage-o4', '22222222-2222-2222-2222-222222222222', 'Produto Recebido', 'produto_recebido', 4, 'Inbox', 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800', true),
  ('stage-o5', '22222222-2222-2222-2222-222222222222', 'Em Análise', 'em_analise', 5, 'Search', 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800', true),
  ('stage-o6', '22222222-2222-2222-2222-222222222222', 'Aprovado Troca/Devolução', 'aprovado_troca_devolucao', 6, 'BadgeCheck', 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800', true),
  ('stage-o7', '22222222-2222-2222-2222-222222222222', 'Resolvido', 'resolvido', 7, 'CheckCircle2', 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800', true),
  ('stage-o8', '22222222-2222-2222-2222-222222222222', 'Cancelado', 'cancelado', 8, 'XCircle', 'bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800', true)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  status_key = EXCLUDED.status_key,
  order_index = EXCLUDED.order_index,
  icon_name = EXCLUDED.icon_name,
  color_class = EXCLUDED.color_class,
  is_active = EXCLUDED.is_active;

-- 5. Atualizar pedidos com status legados para os novos status canônicos
UPDATE public.orders
SET status = 'Pedido Pago'
WHERE status IN ('Novo Pedido', 'Pedido Pago > Aguardando Recebimento da Expedição');

UPDATE public.orders
SET status = 'Pedido Recebido'
WHERE status = 'Pedido Recebido > Aguardando Envio';

-- 6. Corrigir pedidos de Marketplace (Mercado Livre) que foram indevidamente rebaixados para 'pendente' ou 'Novo Pedido'
UPDATE public.orders
SET 
  status = CASE 
    WHEN has_shipping_file = true OR ml_label_url IS NOT NULL THEN 'Pedido Recebido'
    ELSE 'Ag Liberação de Etiqueta'
  END,
  payment_status = 'paid',
  payment_method = 'mercadolivre'
WHERE (marketplace_order_id IS NOT NULL OR ml_order_id IS NOT NULL OR external_reference LIKE '20000%')
  AND status IN ('pendente', 'Novo Pedido', 'pago', 'Pedido Pago > Aguardando Recebimento da Expedição');

-- 7. Criar índice único em order_shipping_files para garantir idempotência de uploads de etiquetas
CREATE UNIQUE INDEX IF NOT EXISTS unq_order_shipping_files_order_path ON public.order_shipping_files(order_id, file_path);


