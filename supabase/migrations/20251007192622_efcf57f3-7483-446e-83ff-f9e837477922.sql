-- Enable realtime for notifications table
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- Function to notify new product
CREATE OR REPLACE FUNCTION notify_new_product()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if product is active
  IF NEW.active = true THEN
    -- Notify all active customer users
    INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
    SELECT 
      user_id,
      '🆕 Novo Produto Disponível!',
      'Confira: ' || NEW.name,
      'new_product',
      '/produto/' || NEW.id,
      'Ver Produto',
      jsonb_build_object('product_id', NEW.id, 'product_name', NEW.name)
    FROM profiles
    WHERE role = 'customer' AND is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to notify product removed/deactivated
CREATE OR REPLACE FUNCTION notify_product_removed()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if product was deactivated
  IF OLD.active = true AND NEW.active = false THEN
    -- Notify users who favorited this product
    INSERT INTO notifications (user_id, title, message, type, metadata)
    SELECT 
      f.user_id,
      '⚠️ Produto Indisponível',
      'O produto "' || NEW.name || '" não está mais disponível.',
      'product_removed',
      jsonb_build_object('product_id', NEW.id, 'product_name', NEW.name)
    FROM favorites f
    INNER JOIN profiles p ON p.user_id = f.user_id
    WHERE f.product_id = NEW.id AND p.is_active = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to notify new lesson
CREATE OR REPLACE FUNCTION notify_new_lesson()
RETURNS TRIGGER AS $$
DECLARE
  course_record RECORD;
BEGIN
  -- Only notify for published lessons
  IF NEW.is_published = true THEN
    -- Get course information
    SELECT c.id, c.title 
    INTO course_record
    FROM courses c
    INNER JOIN course_modules cm ON cm.course_id = c.id
    WHERE cm.id = NEW.module_id;
    
    IF course_record.id IS NOT NULL THEN
      -- Notify enrolled students
      INSERT INTO notifications (user_id, title, message, type, action_url, action_label, metadata)
      SELECT 
        ce.user_id,
        '📚 Nova Aula Disponível!',
        'Nova aula no curso: ' || course_record.title,
        'new_lesson',
        '/minha-conta/courses/' || course_record.id,
        'Assistir Agora',
        jsonb_build_object(
          'course_id', course_record.id,
          'lesson_id', NEW.id,
          'lesson_title', NEW.title
        )
      FROM course_enrollments ce
      INNER JOIN profiles p ON p.user_id = ce.user_id
      WHERE ce.course_id = course_record.id AND p.is_active = true;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers
DROP TRIGGER IF EXISTS on_product_created ON products;
CREATE TRIGGER on_product_created
AFTER INSERT ON products
FOR EACH ROW
EXECUTE FUNCTION notify_new_product();

DROP TRIGGER IF EXISTS on_product_deactivated ON products;
CREATE TRIGGER on_product_deactivated
AFTER UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION notify_product_removed();

DROP TRIGGER IF EXISTS on_lesson_created ON course_lessons;
CREATE TRIGGER on_lesson_created
AFTER INSERT ON course_lessons
FOR EACH ROW
EXECUTE FUNCTION notify_new_lesson();