
-- Step 1: Migrate existing order data to new statuses
UPDATE orders SET status = 'recebido' WHERE status = 'em_preparacao';
UPDATE orders SET status = 'devolucao_andamento' WHERE status = 'devolucao_solicitada';
UPDATE orders SET status = 'devolucao_recebida' WHERE status = 'em_devolucao';
UPDATE orders SET status = 'cancelado' WHERE status IN ('troca_solicitada', 'em_troca');

-- Step 2: Migrate order_status_history
UPDATE order_status_history SET status = 'recebido' WHERE status = 'em_preparacao';
UPDATE order_status_history SET status = 'devolucao_andamento' WHERE status = 'devolucao_solicitada';
UPDATE order_status_history SET status = 'devolucao_recebida' WHERE status = 'em_devolucao';
UPDATE order_status_history SET status = 'cancelado' WHERE status IN ('troca_solicitada', 'em_troca');

-- Step 3: Add new columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS motivo_atraso TEXT,
  ADD COLUMN IF NOT EXISTS motivo_falta TEXT,
  ADD COLUMN IF NOT EXISTS cancelamento_solicitado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelamento_solicitado_por UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS devolucao_iniciada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS devolucao_recebida_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS devolucao_analisada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS devolucao_aprovada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valor_reembolso DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS reembolso_parcial BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS observacao_aprovacao TEXT,
  ADD COLUMN IF NOT EXISTS reembolsado_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observacao_interna TEXT;

-- Step 4: Drop old status constraint and create new one
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status IN (
    'pendente',
    'pago',
    'recebido',
    'embalado',
    'enviado',
    'finalizado',
    'em_reposicao',
    'em_falta',
    'cancelamento_solicitado',
    'cancelado',
    'devolucao_andamento',
    'devolucao_recebida',
    'devolucao_analise',
    'devolucao_aprovada',
    'reembolsado'
  )
);

-- Step 5: Remove troca columns (no longer needed)
ALTER TABLE orders 
  DROP COLUMN IF EXISTS troca_motivo,
  DROP COLUMN IF EXISTS troca_observacao;
