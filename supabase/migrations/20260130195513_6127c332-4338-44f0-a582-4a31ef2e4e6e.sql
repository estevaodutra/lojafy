-- =============================================
-- 1. Tabela para tokens de acesso único
-- =============================================
CREATE TABLE public.one_time_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL UNIQUE,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  redirect_url TEXT DEFAULT '/reseller/onboarding'
);

-- Índices para performance
CREATE INDEX idx_one_time_tokens_token ON public.one_time_access_tokens(token);
CREATE INDEX idx_one_time_tokens_user_id ON public.one_time_access_tokens(user_id);
CREATE INDEX idx_one_time_tokens_expires_at ON public.one_time_access_tokens(expires_at);

-- RLS
ALTER TABLE public.one_time_access_tokens ENABLE ROW LEVEL SECURITY;

-- Super admins podem criar e visualizar tokens
CREATE POLICY "Super admins can manage tokens"
ON public.one_time_access_tokens
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- 2. Tabela de configuração do onboarding
-- =============================================
CREATE TABLE public.reseller_onboarding_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Bem-vindo à Lojafy!',
  description TEXT,
  video_url TEXT,
  video_provider TEXT DEFAULT 'youtube' CHECK (video_provider IN ('youtube', 'vimeo', 'google_drive')),
  video_aspect_ratio TEXT DEFAULT '16:9' CHECK (video_aspect_ratio IN ('16:9', '9:16')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  redirect_after TEXT DEFAULT '/reseller/dashboard',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.reseller_onboarding_config ENABLE ROW LEVEL SECURITY;

-- Super admins podem gerenciar configurações
CREATE POLICY "Super admins can manage onboarding config"
ON public.reseller_onboarding_config
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Usuários autenticados podem ler configurações ativas
CREATE POLICY "Authenticated users can read active config"
ON public.reseller_onboarding_config
FOR SELECT
TO authenticated
USING (is_active = true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_reseller_onboarding_config_updated_at
BEFORE UPDATE ON public.reseller_onboarding_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão
INSERT INTO public.reseller_onboarding_config (title, description, is_active)
VALUES (
  'Bem-vindo à Lojafy!',
  'Assista ao vídeo de boas-vindas para conhecer a plataforma e começar a vender.',
  false
);

-- =============================================
-- 3. Adicionar colunas de onboarding em profiles
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;