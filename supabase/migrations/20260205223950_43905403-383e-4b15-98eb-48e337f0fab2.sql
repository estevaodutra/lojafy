-- Criar tabela para armazenar integrações do Mercado Livre
CREATE TABLE public.mercadolivre_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dados do OAuth do Mercado Livre
  access_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  refresh_token TEXT,
  expires_in INTEGER,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  ml_user_id BIGINT NOT NULL,
  
  -- Metadados
  is_active BOOLEAN DEFAULT true,
  last_refreshed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: um usuário só pode ter uma integração ativa por vez
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE public.mercadolivre_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários podem ver suas próprias integrações
CREATE POLICY "Users can view own integrations" 
  ON public.mercadolivre_integrations FOR SELECT 
  USING (user_id = auth.uid());

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_mercadolivre_integrations_updated_at
  BEFORE UPDATE ON public.mercadolivre_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();