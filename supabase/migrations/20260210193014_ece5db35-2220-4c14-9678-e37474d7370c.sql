
-- 1. Remover constraint antiga PRIMEIRO
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- 2. Migrar dados existentes de EN para PT na tabela orders
UPDATE orders SET status = 'pendente' WHERE status = 'pending';
UPDATE orders SET status = 'em_preparacao' WHERE status = 'processing';
UPDATE orders SET status = 'enviado' WHERE status = 'shipped';
UPDATE orders SET status = 'finalizado' WHERE status = 'delivered';
UPDATE orders SET status = 'cancelado' WHERE status = 'cancelled';
UPDATE orders SET status = 'reembolsado' WHERE status = 'refunded';

-- 3. Migrar historico de status
UPDATE order_status_history SET status = 'pendente' WHERE status = 'pending';
UPDATE order_status_history SET status = 'em_preparacao' WHERE status = 'processing';
UPDATE order_status_history SET status = 'enviado' WHERE status = 'shipped';
UPDATE order_status_history SET status = 'finalizado' WHERE status = 'delivered';
UPDATE order_status_history SET status = 'cancelado' WHERE status = 'cancelled';
UPDATE order_status_history SET status = 'reembolsado' WHERE status = 'refunded';

-- 4. Criar nova constraint com todos os status em portugues
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status = ANY (ARRAY[
    'pendente', 'recebido', 'em_preparacao', 'embalado',
    'enviado', 'em_reposicao', 'em_falta',
    'finalizado', 'cancelado', 'reembolsado'
  ])
);

-- 5. Adicionar coluna para previsao de envio (usado no status em_reposicao)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_shipping_date date;

-- 6. Adicionar coluna para motivo do status (usado em em_falta/cancelado)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_reason text;
