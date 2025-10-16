-- Criar tabela de notificações obrigatórias
CREATE TABLE public.mandatory_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  video_url TEXT,
  video_provider TEXT CHECK (video_provider IN ('youtube', 'vimeo', 'direct')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'customer', 'reseller', 'supplier')),
  action_url TEXT,
  action_label TEXT DEFAULT 'Entendido',
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX idx_mandatory_notifications_active ON public.mandatory_notifications(is_active);
CREATE INDEX idx_mandatory_notifications_target ON public.mandatory_notifications(target_audience);
CREATE INDEX idx_mandatory_notifications_priority ON public.mandatory_notifications(priority DESC);

-- Trigger updated_at
CREATE TRIGGER update_mandatory_notifications_updated_at
  BEFORE UPDATE ON public.mandatory_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.mandatory_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage mandatory notifications"
  ON public.mandatory_notifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Users can view active mandatory notifications"
  ON public.mandatory_notifications
  FOR SELECT
  USING (
    is_active = true AND
    (expires_at IS NULL OR expires_at > NOW()) AND
    (
      target_audience = 'all' OR
      target_audience IN (
        SELECT role::text FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

-- Criar tabela de visualizações
CREATE TABLE public.mandatory_notification_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.mandatory_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  video_watched_seconds INTEGER DEFAULT 0,
  video_completed BOOLEAN NOT NULL DEFAULT false,
  button_clicked BOOLEAN NOT NULL DEFAULT false,
  action_clicked BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(notification_id, user_id)
);

-- Índices
CREATE INDEX idx_mandatory_views_notification ON public.mandatory_notification_views(notification_id);
CREATE INDEX idx_mandatory_views_user ON public.mandatory_notification_views(user_id);
CREATE INDEX idx_mandatory_views_completed ON public.mandatory_notification_views(video_completed);

-- RLS
ALTER TABLE public.mandatory_notification_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own views"
  ON public.mandatory_notification_views
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own views"
  ON public.mandatory_notification_views
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own views"
  ON public.mandatory_notification_views
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all views"
  ON public.mandatory_notification_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Função para calcular métricas CTR
CREATE OR REPLACE FUNCTION get_mandatory_notification_metrics(notification_uuid UUID)
RETURNS TABLE (
  total_views BIGINT,
  video_completed_count BIGINT,
  button_clicked_count BIGINT,
  action_clicked_count BIGINT,
  ctr_video_completion NUMERIC,
  ctr_button_click NUMERIC,
  ctr_action_click NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_views,
    COUNT(*) FILTER (WHERE video_completed = true)::BIGINT AS video_completed_count,
    COUNT(*) FILTER (WHERE button_clicked = true)::BIGINT AS button_clicked_count,
    COUNT(*) FILTER (WHERE action_clicked = true)::BIGINT AS action_clicked_count,
    ROUND(
      (COUNT(*) FILTER (WHERE video_completed = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) AS ctr_video_completion,
    ROUND(
      (COUNT(*) FILTER (WHERE button_clicked = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) AS ctr_button_click,
    ROUND(
      (COUNT(*) FILTER (WHERE action_clicked = true)::NUMERIC / NULLIF(COUNT(*), 0)) * 100, 
      2
    ) AS ctr_action_click
  FROM mandatory_notification_views
  WHERE notification_id = notification_uuid;
END;
$$;