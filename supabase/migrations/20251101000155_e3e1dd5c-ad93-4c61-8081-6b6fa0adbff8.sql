-- Adicionar coluna payment_expires_at para rastrear expiração de pagamento
ALTER TABLE orders 
ADD COLUMN payment_expires_at TIMESTAMPTZ DEFAULT NULL;

-- Criar índice para performance na busca de pedidos expirados
CREATE INDEX idx_orders_payment_expires 
ON orders(payment_expires_at) 
WHERE payment_status = 'pending' AND status = 'pending';

COMMENT ON COLUMN orders.payment_expires_at IS 'Data/hora de expiração do pagamento PIX (30 minutos após criação)';