-- 20260801204500_create_marketplace_credentials.sql
-- Remover colunas da tabela platform_settings
ALTER TABLE public.platform_settings 
  DROP COLUMN IF EXISTS ml_client_id,
  DROP COLUMN IF EXISTS ml_client_secret,
  DROP COLUMN IF EXISTS app_url;

-- Criar a nova tabela para credenciais de marketplaces
CREATE TABLE IF NOT EXISTS public.marketplace_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  marketplace TEXT NOT NULL UNIQUE, -- 'mercadolivre', 'shopee', etc.
  client_id TEXT,
  client_secret TEXT,
  app_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir registro padrão do Mercado Livre
INSERT INTO public.marketplace_credentials (marketplace) 
VALUES ('mercadolivre') 
ON CONFLICT (marketplace) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.marketplace_credentials ENABLE ROW LEVEL SECURITY;

-- Política para super_admin gerenciar
CREATE POLICY "Super admins can manage marketplace credentials" ON public.marketplace_credentials
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Política para usuários autenticados visualizarem (apenas client_id e app_url são seguros para o público)
CREATE POLICY "Anyone can view marketplace credentials" ON public.marketplace_credentials
  FOR SELECT USING (true);
