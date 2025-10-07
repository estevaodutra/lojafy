-- Remove a constraint antiga que impede novos tipos de notificação
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Adiciona a constraint atualizada com todos os tipos de notificação
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
  'custom'
));