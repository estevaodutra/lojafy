-- Trigger para notificar cliente sobre expiração de pedido
CREATE OR REPLACE FUNCTION notify_order_expired()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Se o pedido mudou para cancelled + expired
  IF NEW.status = 'cancelled' 
     AND NEW.payment_status = 'expired' 
     AND OLD.status = 'pending' THEN
    
    -- Inserir notificação (se houver user_id)
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, action_url, metadata)
      VALUES (
        NEW.user_id,
        '⏰ Pedido Expirado',
        'Seu pedido ' || NEW.order_number || ' foi cancelado por falta de pagamento.',
        'order_expired',
        '/customer/orders',
        jsonb_build_object('order_id', NEW.id, 'order_number', NEW.order_number)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_notify_order_expired
AFTER UPDATE ON orders
FOR EACH ROW
WHEN (NEW.status = 'cancelled' AND NEW.payment_status = 'expired')
EXECUTE FUNCTION notify_order_expired();

COMMENT ON FUNCTION notify_order_expired() IS 'Envia notificação ao cliente quando um pedido expira e é cancelado automaticamente';