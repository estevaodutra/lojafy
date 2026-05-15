-- Adiciona tipos de notificação que estavam faltando no CHECK constraint
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check,
  ADD CONSTRAINT notifications_type_check CHECK (type IN (
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
    'course_completed',
    'product_reactivated',
    'wallet_alert',
    'wallet_credit',
    'new_order',
    'shipping_label'
  ));
