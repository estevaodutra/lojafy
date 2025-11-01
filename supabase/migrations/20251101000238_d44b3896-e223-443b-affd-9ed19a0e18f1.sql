-- Função para buscar pedidos expirados
CREATE OR REPLACE FUNCTION public.get_expired_orders()
RETURNS TABLE(
  order_id UUID,
  order_number TEXT,
  created_at TIMESTAMPTZ,
  payment_expires_at TIMESTAMPTZ,
  minutes_expired INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.order_number,
    o.created_at,
    o.payment_expires_at,
    EXTRACT(EPOCH FROM (NOW() - o.payment_expires_at))::INTEGER / 60 as minutes_expired
  FROM orders o
  WHERE 
    o.payment_status = 'pending'
    AND o.status = 'pending'
    AND o.payment_expires_at IS NOT NULL
    AND o.payment_expires_at < NOW()
  ORDER BY o.payment_expires_at ASC;
END;
$$;

-- Função para cancelar pedido expirado
CREATE OR REPLACE FUNCTION public.cancel_expired_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_number TEXT;
  v_affected_rows INTEGER;
BEGIN
  -- Buscar número do pedido
  SELECT order_number INTO v_order_number
  FROM orders
  WHERE id = p_order_id;
  
  -- Atualizar status do pedido
  UPDATE orders
  SET 
    status = 'cancelled',
    payment_status = 'expired',
    updated_at = NOW()
  WHERE 
    id = p_order_id
    AND payment_status = 'pending'
    AND status = 'pending'
    AND payment_expires_at < NOW();
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  
  -- Se o pedido foi cancelado, registrar no histórico
  IF v_affected_rows > 0 THEN
    INSERT INTO order_status_history (order_id, status, notes)
    VALUES (
      p_order_id, 
      'cancelled', 
      'Pedido cancelado automaticamente - Pagamento não confirmado em 30 minutos'
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.get_expired_orders() IS 'Retorna lista de pedidos com pagamento expirado (>30 minutos)';
COMMENT ON FUNCTION public.cancel_expired_order(UUID) IS 'Cancela um pedido expirado e registra no histórico';