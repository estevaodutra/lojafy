-- Tabela para configuração de webhooks
CREATE TABLE public.webhook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  webhook_url TEXT,
  active BOOLEAN DEFAULT false,
  secret_token TEXT DEFAULT 'whsec_' || encode(extensions.gen_random_bytes(24), 'hex'),
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  last_error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.webhook_settings ENABLE ROW LEVEL SECURITY;

-- Política: apenas super_admin pode ler
CREATE POLICY "Super admins can view webhook settings"
ON public.webhook_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Política: apenas super_admin pode inserir
CREATE POLICY "Super admins can insert webhook settings"
ON public.webhook_settings
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Política: apenas super_admin pode atualizar
CREATE POLICY "Super admins can update webhook settings"
ON public.webhook_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Política: apenas super_admin pode deletar
CREATE POLICY "Super admins can delete webhook settings"
ON public.webhook_settings
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_webhook_settings_updated_at
BEFORE UPDATE ON public.webhook_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir eventos iniciais
INSERT INTO public.webhook_settings (event_type, active) VALUES
  ('order.paid', false),
  ('user.created', false),
  ('user.inactive.7days', false),
  ('user.inactive.15days', false),
  ('user.inactive.30days', false);

-- Tabela para log de disparos de webhook (histórico)
CREATE TABLE public.webhook_dispatch_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB,
  status_code INTEGER,
  response_body TEXT,
  error_message TEXT,
  dispatched_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.webhook_dispatch_logs ENABLE ROW LEVEL SECURITY;

-- Política: apenas super_admin pode ler logs
CREATE POLICY "Super admins can view webhook logs"
ON public.webhook_dispatch_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Tabela para controlar disparos de inatividade (evitar duplicatas)
CREATE TABLE public.webhook_inactivity_dispatched (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, event_type)
);

-- Habilitar RLS
ALTER TABLE public.webhook_inactivity_dispatched ENABLE ROW LEVEL SECURITY;

-- Política: apenas super_admin pode ler/escrever
CREATE POLICY "Super admins can manage inactivity dispatched"
ON public.webhook_inactivity_dispatched
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Índice para performance
CREATE INDEX idx_webhook_dispatch_logs_event_type ON public.webhook_dispatch_logs(event_type);
CREATE INDEX idx_webhook_dispatch_logs_dispatched_at ON public.webhook_dispatch_logs(dispatched_at DESC);
CREATE INDEX idx_webhook_inactivity_dispatched_user ON public.webhook_inactivity_dispatched(user_id, event_type);