
-- 1. Insert template for product_removed
INSERT INTO notification_templates (trigger_type, title_template, message_template, target_audience, active, total_sent, total_read)
VALUES ('product_removed', '⚠️ Produto Indisponível', 'O produto "{PRODUCT_NAME}" não está mais disponível.', 'all_customers', true, 0, 0);

-- 2. Update send_automatic_notification to support all_customers
CREATE OR REPLACE FUNCTION public.send_automatic_notification(p_trigger_type text, p_variables jsonb, p_target_user_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      f.user_id, v_title, v_message, v_template.trigger_type, v_action_url, v_template.action_label, p_variables
    FROM favorites f
    INNER JOIN profiles p ON p.user_id = f.user_id
    WHERE f.product_id = (p_variables->>'PRODUCT_ID')::uuid
      AND p.is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF v_template.target_audience = 'customer_only' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT 
      unnest(p_target_user_ids), v_title, v_message, v_template.trigger_type, v_action_url, v_template.action_label, p_variables;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
    
  ELSIF v_template.target_audience = 'enrolled_only' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT 
      ce.user_id, v_title, v_message, v_template.trigger_type, v_action_url, v_template.action_label, p_variables
    FROM course_enrollments ce
    INNER JOIN profiles p ON p.user_id = ce.user_id
    WHERE ce.course_id = (p_variables->>'COURSE_ID')::uuid
      AND p.is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;

  ELSIF v_template.target_audience = 'all_customers' THEN
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT 
      p.user_id, v_title, v_message, v_template.trigger_type, v_action_url, v_template.action_label, p_variables
    FROM profiles p
    WHERE p.role = 'customer' AND p.is_active = true;
    GET DIAGNOSTICS v_sent_count = ROW_COUNT;
  END IF;
  
  UPDATE notification_templates
  SET 
    total_sent = total_sent + v_sent_count,
    last_sent_at = NOW()
  WHERE id = v_template.id;
  
  RETURN v_sent_count;
END;
$function$;

-- 3. Update notify_product_removed to use template system
CREATE OR REPLACE FUNCTION public.notify_product_removed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.active = true AND NEW.active = false THEN
    PERFORM send_automatic_notification(
      'product_removed',
      jsonb_build_object(
        'PRODUCT_ID', NEW.id::text,
        'PRODUCT_NAME', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;
