ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancelamento_motivo TEXT,
  ADD COLUMN IF NOT EXISTS cancelamento_observacao TEXT,
  ADD COLUMN IF NOT EXISTS devolucao_motivo TEXT,
  ADD COLUMN IF NOT EXISTS devolucao_observacao TEXT,
  ADD COLUMN IF NOT EXISTS troca_motivo TEXT,
  ADD COLUMN IF NOT EXISTS troca_observacao TEXT;