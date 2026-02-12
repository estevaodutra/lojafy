
-- 1. Inserir template product_reactivated
INSERT INTO public.notification_templates (
  trigger_type,
  active,
  title_template,
  message_template,
  target_audience,
  action_url_template,
  action_label,
  total_sent,
  total_read
) VALUES (
  'product_reactivated',
  true,
  'O produto {PRODUCT_NAME} está disponível novamente!',
  'O produto {PRODUCT_NAME} voltou ao catálogo. Aproveite!',
  'all_customers',
  '/produto/{PRODUCT_ID}',
  'Ver Produto',
  0,
  0
);

-- 2. Criar função notify_product_reactivated()
CREATE OR REPLACE FUNCTION public.notify_product_reactivated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.active = false AND NEW.active = true THEN
    PERFORM send_automatic_notification(
      'product_reactivated',
      jsonb_build_object(
        'PRODUCT_ID', NEW.id::text,
        'PRODUCT_NAME', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Criar trigger on_product_reactivated
CREATE TRIGGER on_product_reactivated
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_product_reactivated();
