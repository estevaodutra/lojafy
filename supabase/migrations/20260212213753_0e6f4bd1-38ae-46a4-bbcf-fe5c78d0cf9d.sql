
-- 1. Corrigir notify_order_confirmed: 'confirmed' -> 'recebido'
CREATE OR REPLACE FUNCTION public.notify_order_confirmed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'recebido' AND (OLD.status IS NULL OR OLD.status != 'recebido') THEN
    PERFORM send_automatic_notification(
      'order_confirmed',
      jsonb_build_object(
        'ORDER_ID', NEW.id::text,
        'ORDER_NUMBER', NEW.order_number
      ),
      ARRAY[NEW.user_id]
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 2. Corrigir notify_order_shipped: 'shipped' -> 'enviado'
CREATE OR REPLACE FUNCTION public.notify_order_shipped()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'enviado' AND (OLD.status IS NULL OR OLD.status != 'enviado') THEN
    PERFORM send_automatic_notification(
      'order_shipped',
      jsonb_build_object(
        'ORDER_ID', NEW.id::text,
        'ORDER_NUMBER', NEW.order_number,
        'TRACKING_CODE', COALESCE(NEW.tracking_number, 'Em breve')
      ),
      ARRAY[NEW.user_id]
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Corrigir notify_order_delivered: 'delivered' -> 'finalizado'
CREATE OR REPLACE FUNCTION public.notify_order_delivered()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'finalizado' AND (OLD.status IS NULL OR OLD.status != 'finalizado') THEN
    PERFORM send_automatic_notification(
      'order_delivered',
      jsonb_build_object(
        'ORDER_ID', NEW.id::text,
        'ORDER_NUMBER', NEW.order_number
      ),
      ARRAY[NEW.user_id]
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Corrigir notify_order_expired: 'cancelled' -> 'cancelado'
CREATE OR REPLACE FUNCTION public.notify_order_expired()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelado' 
     AND NEW.payment_status = 'expired' 
     AND OLD.status = 'pendente' THEN
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
$function$;

-- 5. Recriar trigger com WHEN corrigido
DROP TRIGGER IF EXISTS trigger_notify_order_expired ON public.orders;
CREATE TRIGGER trigger_notify_order_expired 
  AFTER UPDATE ON public.orders 
  FOR EACH ROW 
  WHEN (NEW.status = 'cancelado' AND NEW.payment_status = 'expired')
  EXECUTE FUNCTION notify_order_expired();

-- 6. Corrigir notify_product_removed: notificar todos os clientes ativos
CREATE OR REPLACE FUNCTION public.notify_product_removed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.active = true AND NEW.active = false THEN
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT 
      p.user_id,
      '⚠️ Produto Indisponível',
      'O produto "' || NEW.name || '" não está mais disponível.',
      'product_removed',
      jsonb_build_object('product_id', NEW.id, 'product_name', NEW.name)
    FROM profiles p
    WHERE p.role = 'customer' AND p.is_active = true;
  END IF;
  RETURN NEW;
END;
$function$;
