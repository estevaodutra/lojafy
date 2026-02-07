
-- Tabela para armazenar dados de produtos customizados por marketplace
CREATE TABLE public.product_marketplace_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamento com produto Lojafy
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  
  -- Identificação do marketplace
  marketplace TEXT NOT NULL CHECK (marketplace IN ('mercadolivre', 'shopee', 'amazon', 'magalu', 'americanas', 'via_varejo')),
  
  -- Dados customizados para o marketplace
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  promotional_price DECIMAL(10,2),
  
  -- Categoria do marketplace
  category_id TEXT,
  category_name TEXT,
  
  -- Atributos específicos do marketplace (flexível via JSONB)
  attributes JSONB DEFAULT '{}',
  
  -- Variações do produto (cor, tamanho, voltagem com estoque/preço individual)
  variations JSONB DEFAULT '[]',
  
  -- Estoque (usado quando não há variações)
  stock_quantity INTEGER DEFAULT 0,
  
  -- Imagens (pode ser diferente do produto original)
  images JSONB DEFAULT '[]',
  
  -- Status do produto no marketplace
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft', 'pending', 'pending_review', 'active', 'paused', 'inactive', 'error', 'deleted'
  )),
  
  -- Dados retornados pelo marketplace após publicação
  listing_id TEXT,
  listing_url TEXT,
  listing_type TEXT,
  
  -- Controle de sincronização
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT,
  sync_error_log TEXT,
  
  -- Dados adicionais específicos do marketplace
  marketplace_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ,
  
  -- Constraint de unicidade
  UNIQUE(product_id, marketplace)
);

-- Índices para performance
CREATE INDEX idx_pmd_product_id ON public.product_marketplace_data(product_id);
CREATE INDEX idx_pmd_marketplace ON public.product_marketplace_data(marketplace);
CREATE INDEX idx_pmd_status ON public.product_marketplace_data(status);
CREATE INDEX idx_pmd_user_id ON public.product_marketplace_data(user_id);
CREATE INDEX idx_pmd_listing_id ON public.product_marketplace_data(listing_id);
CREATE INDEX idx_pmd_marketplace_status ON public.product_marketplace_data(marketplace, status);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_pmd_updated_at
  BEFORE UPDATE ON public.product_marketplace_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE public.product_marketplace_data ENABLE ROW LEVEL SECURITY;

-- Policy: Usuários só veem seus próprios dados
CREATE POLICY "Users can view own marketplace data"
  ON public.product_marketplace_data
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Usuários só podem inserir seus próprios dados
CREATE POLICY "Users can insert own marketplace data"
  ON public.product_marketplace_data
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Usuários só podem atualizar seus próprios dados
CREATE POLICY "Users can update own marketplace data"
  ON public.product_marketplace_data
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Usuários só podem deletar seus próprios dados
CREATE POLICY "Users can delete own marketplace data"
  ON public.product_marketplace_data
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Service role tem acesso total (para Edge Functions/n8n)
CREATE POLICY "Service role has full access to marketplace data"
  ON public.product_marketplace_data
  FOR ALL
  USING (auth.role() = 'service_role');
