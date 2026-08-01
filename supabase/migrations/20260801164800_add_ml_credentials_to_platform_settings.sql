-- 20260801164800_add_ml_credentials_to_platform_settings.sql
-- Adiciona colunas para armazenamento de credenciais de integração do Mercado Livre na tabela platform_settings

ALTER TABLE public.platform_settings 
  ADD COLUMN IF NOT EXISTS ml_client_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_client_secret TEXT;

COMMENT ON COLUMN public.platform_settings.ml_client_id IS 'Client ID da aplicação de integração do Mercado Livre.';
COMMENT ON COLUMN public.platform_settings.ml_client_secret IS 'Client Secret da aplicação de integração do Mercado Livre.';
