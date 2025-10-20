-- Add columns to track daily views for 7 days
ALTER TABLE public.mandatory_notification_views
ADD COLUMN IF NOT EXISTS days_viewed INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_viewed_date DATE DEFAULT CURRENT_DATE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_notification_views_last_date 
ON public.mandatory_notification_views(user_id, notification_id, last_viewed_date);

-- Add comments
COMMENT ON COLUMN public.mandatory_notification_views.days_viewed IS 
  'Conta quantos dias diferentes o usuário visualizou esta notificação (máximo 7)';
COMMENT ON COLUMN public.mandatory_notification_views.last_viewed_date IS 
  'Data da última visualização (sem hora) para controlar visualizações diárias';