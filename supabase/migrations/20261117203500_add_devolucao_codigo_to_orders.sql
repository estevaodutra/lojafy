-- Migration: Adicionar coluna de código de devolução / recebimento na tabela orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS devolucao_codigo TEXT,
ADD COLUMN IF NOT EXISTS devolucao_codigo_informado_em TIMESTAMPTZ;

-- Adicionar índice para consultas se necessário
CREATE INDEX IF NOT EXISTS idx_orders_devolucao_codigo ON public.orders(devolucao_codigo) WHERE devolucao_codigo IS NOT NULL;
