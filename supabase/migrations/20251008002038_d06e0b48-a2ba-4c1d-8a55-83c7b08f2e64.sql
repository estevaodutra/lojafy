-- Criar tabela de templates de notificações automáticas
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  target_audience TEXT NOT NULL DEFAULT 'all',
  action_url_template TEXT,
  action_label TEXT,
  conditions JSONB DEFAULT '{}'::jsonb,
  total_sent INTEGER DEFAULT 0,
  total_read INTEGER DEFAULT 0,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_notification_templates_trigger ON notification_templates(trigger_type);
CREATE INDEX idx_notification_templates_active ON notification_templates(active);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage templates"
ON notification_templates FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Anyone can view active templates"
ON notification_templates FOR SELECT
TO authenticated
USING (active = true);

-- Inserir templates padrão
INSERT INTO notification_templates (trigger_type, title_template, message_template, target_audience, action_url_template, action_label, conditions) VALUES
('price_decrease', '💰 {PRODUCT_NAME} ficou mais barato!', 'De R$ {OLD_PRICE} por apenas R$ {NEW_PRICE}. Economia de {DISCOUNT_PERCENTAGE}%!', 'favorites_only', '/produto/{PRODUCT_ID}', 'Aproveitar Desconto', '{"min_discount_percentage": 5}'::jsonb),
('price_increase', '⚠️ {PRODUCT_NAME} teve reajuste de preço', 'O preço foi atualizado de R$ {OLD_PRICE} para R$ {NEW_PRICE}', 'favorites_only', '/produto/{PRODUCT_ID}', 'Ver Produto', '{"notify_threshold_percentage": 10}'::jsonb),
('back_in_stock', '✨ {PRODUCT_NAME} está de volta!', 'O produto que você favoritou voltou ao estoque. Corra antes que acabe!', 'favorites_only', '/produto/{PRODUCT_ID}', 'Comprar Agora', '{}'::jsonb),
('low_stock', '⏰ Últimas unidades de {PRODUCT_NAME}!', 'Restam apenas {STOCK_QUANTITY} unidades em estoque. Não perca!', 'favorites_only', '/produto/{PRODUCT_ID}', 'Garantir o Meu', '{"low_stock_threshold": 5}'::jsonb),
('order_confirmed', '✅ Pedido {ORDER_NUMBER} confirmado!', 'Seu pedido foi confirmado e está sendo preparado para envio.', 'customer_only', '/minha-conta/pedidos/{ORDER_ID}', 'Acompanhar Pedido', '{}'::jsonb),
('order_shipped', '📦 Pedido {ORDER_NUMBER} enviado!', 'Seu pedido está a caminho! Código de rastreamento: {TRACKING_CODE}', 'customer_only', '/minha-conta/pedidos/{ORDER_ID}', 'Rastrear Entrega', '{}'::jsonb),
('order_delivered', '🎉 Pedido {ORDER_NUMBER} entregue!', 'Seu pedido foi entregue com sucesso. Aproveite!', 'customer_only', '/minha-conta/pedidos/{ORDER_ID}', 'Avaliar Pedido', '{}'::jsonb),
('new_lesson', '📚 Nova aula: {LESSON_TITLE}!', 'Uma nova aula foi adicionada ao curso {COURSE_NAME}.', 'enrolled_only', '/minha-conta/courses/{COURSE_ID}', 'Assistir Agora', '{}'::jsonb),
('course_completed', '🎓 Parabéns! Você concluiu {COURSE_NAME}!', 'Você completou 100% do curso. Continue aprendendo!', 'customer_only', '/minha-conta/courses', 'Ver Certificado', '{}'::jsonb);

-- Função para enviar notificações automáticas
CREATE OR REPLACE FUNCTION send_automatic_notification(
  p_trigger_type TEXT,
  p_variables JSONB,
  p_target_user_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_title TEXT;
  v_message TEXT;
  v_action_url TEXT;
  v_sent_count INTEGER := 0;
  v_key TEXT;
  v_value TEXT;
BEGIN
  SELECT * INTO v_template
  FROM notification_templates
  WHERE trigger_type = p_trigger_type AND active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  v_title := v_template.title_template;
  v_message := v_template.message_template;
  v_action_url := v_template.action_url_template;
  
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_title := REPLACE(v_title, '{' || v_key || '}', v_value);
    v_message := REPLACE(v_message, '{' || v_key || '}', v_value);
    IF v_action_url IS NOT NULL THEN
      v_action_url := REPLACE(v_action_url, '{' || v_key || '}', v_value);
    END IF;
  END LOOP;
  
  IF v_template.target_audience = 'favorites_only' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT 
      f.user_id,
      v_title,
      v_message,
      v_template.trigger_type,
      v_action_url,
      v_template.action_label,
      p_variables
    FROM favorites f
    INNER JOIN profiles p ON p.user_id = f.user_id
    WHERE f.product_id = (p_variables->>'PRODUCT_ID')::uuid
      AND p.is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF v_template.target_audience = 'customer_only' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT 
      unnest(p_target_user_ids),
      v_title,
      v_message,
      v_template.trigger_type,
      v_action_url,
      v_template.action_label,
      p_variables;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF v_template.target_audience = 'enrolled_only' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT 
      ce.user_id,
      v_title,
      v_message,
      v_template.trigger_type,
      v_action_url,
      v_template.action_label,
      p_variables
    FROM course_enrollments ce
    INNER JOIN profiles p ON p.user_id = ce.user_id
    WHERE ce.course_id = (p_variables->>'COURSE_ID')::uuid
      AND p.is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
  END IF;
  
  UPDATE notification_templates
  SET 
    total_sent = total_sent + v_sent_count,
    last_sent_at = NOW()
  WHERE id = v_template.id;
  
  RETURN v_sent_count;
END;
$$;

-- Trigger: Produto ficou mais barato
CREATE OR REPLACE FUNCTION notify_price_decrease()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_discount_pct NUMERIC;
  v_template RECORD;
  v_min_discount NUMERIC;
BEGIN
  IF NEW.price >= OLD.price THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO v_template
  FROM notification_templates
  WHERE trigger_type = 'price_decrease' AND active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  v_discount_pct := ((OLD.price - NEW.price) / OLD.price) * 100;
  v_min_discount := COALESCE((v_template.conditions->>'min_discount_percentage')::numeric, 0);
  
  IF v_discount_pct < v_min_discount THEN
    RETURN NEW;
  END IF;
  
  PERFORM send_automatic_notification(
    'price_decrease',
    jsonb_build_object(
      'PRODUCT_ID', NEW.id::text,
      'PRODUCT_NAME', NEW.name,
      'OLD_PRICE', TO_CHAR(OLD.price, 'FM999G999D90'),
      'NEW_PRICE', TO_CHAR(NEW.price, 'FM999G999D90'),
      'DISCOUNT_PERCENTAGE', ROUND(v_discount_pct)::text
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_price_decrease
AFTER UPDATE OF price ON products
FOR EACH ROW
EXECUTE FUNCTION notify_price_decrease();

-- Trigger: Produto ficou mais caro
CREATE OR REPLACE FUNCTION notify_price_increase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_increase_pct NUMERIC;
  v_template RECORD;
  v_threshold NUMERIC;
BEGIN
  IF NEW.price <= OLD.price THEN
    RETURN NEW;
  END IF;
  
  SELECT * INTO v_template
  FROM notification_templates
  WHERE trigger_type = 'price_increase' AND active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  v_increase_pct := ((NEW.price - OLD.price) / OLD.price) * 100;
  v_threshold := COALESCE((v_template.conditions->>'notify_threshold_percentage')::numeric, 5);
  
  IF v_increase_pct < v_threshold THEN
    RETURN NEW;
  END IF;
  
  PERFORM send_automatic_notification(
    'price_increase',
    jsonb_build_object(
      'PRODUCT_ID', NEW.id::text,
      'PRODUCT_NAME', NEW.name,
      'OLD_PRICE', TO_CHAR(OLD.price, 'FM999G999D90'),
      'NEW_PRICE', TO_CHAR(NEW.price, 'FM999G999D90')
    )
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_price_increase
AFTER UPDATE OF price ON products
FOR EACH ROW
EXECUTE FUNCTION notify_price_increase();

-- Trigger: Produto voltou ao estoque
CREATE OR REPLACE FUNCTION notify_back_in_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stock_quantity = 0 AND NEW.stock_quantity > 0 THEN
    PERFORM send_automatic_notification(
      'back_in_stock',
      jsonb_build_object(
        'PRODUCT_ID', NEW.id::text,
        'PRODUCT_NAME', NEW.name,
        'STOCK_QUANTITY', NEW.stock_quantity::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_back_in_stock
AFTER UPDATE OF stock_quantity ON products
FOR EACH ROW
EXECUTE FUNCTION notify_back_in_stock();

-- Trigger: Estoque baixo
CREATE OR REPLACE FUNCTION notify_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template RECORD;
  v_threshold INTEGER;
BEGIN
  SELECT * INTO v_template
  FROM notification_templates
  WHERE trigger_type = 'low_stock' AND active = true
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  v_threshold := COALESCE((v_template.conditions->>'low_stock_threshold')::integer, 5);
  
  IF NEW.stock_quantity <= v_threshold 
     AND NEW.stock_quantity > 0 
     AND OLD.stock_quantity > v_threshold 
     AND NEW.active = true THEN
    
    PERFORM send_automatic_notification(
      'low_stock',
      jsonb_build_object(
        'PRODUCT_ID', NEW.id::text,
        'PRODUCT_NAME', NEW.name,
        'STOCK_QUANTITY', NEW.stock_quantity::text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_product_low_stock
AFTER UPDATE OF stock_quantity ON products
FOR EACH ROW
EXECUTE FUNCTION notify_low_stock();

-- Trigger: Pedido confirmado
CREATE OR REPLACE FUNCTION notify_order_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
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
$$;

CREATE TRIGGER on_order_status_confirmed
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_confirmed();

-- Trigger: Pedido enviado
CREATE OR REPLACE FUNCTION notify_order_shipped()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'shipped' AND (OLD.status IS NULL OR OLD.status != 'shipped') THEN
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
$$;

CREATE TRIGGER on_order_status_shipped
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_shipped();

-- Trigger: Pedido entregue
CREATE OR REPLACE FUNCTION notify_order_delivered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
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
$$;

CREATE TRIGGER on_order_status_delivered
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_order_delivered();

-- Atualizar constraint de tipos de notificação
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'order',
  'product', 
  'financial',
  'system',
  'new_product',
  'product_removed',
  'new_lesson',
  'new_feature',
  'promotion',
  'custom',
  'price_decrease',
  'price_increase',
  'back_in_stock',
  'low_stock',
  'order_confirmed',
  'order_shipped',
  'order_delivered',
  'course_completed'
));

-- Atualizar trigger existente de nova aula
CREATE OR REPLACE FUNCTION notify_new_lesson()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_record RECORD;
BEGIN
  IF NEW.is_published = true AND (OLD.is_published IS NULL OR OLD.is_published = false) THEN
    SELECT c.id, c.title 
    INTO course_record
    FROM courses c
    INNER JOIN course_modules cm ON cm.course_id = c.id
    WHERE cm.id = NEW.module_id;
    
    IF course_record.id IS NOT NULL THEN
      PERFORM send_automatic_notification(
        'new_lesson',
        jsonb_build_object(
          'COURSE_ID', course_record.id::text,
          'COURSE_NAME', course_record.title,
          'LESSON_TITLE', NEW.title
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;