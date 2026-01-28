-- =============================================
-- FASE 1: SISTEMA DE FEATURES
-- =============================================

-- 1.1 Criar enum para status de feature
CREATE TYPE public.feature_status AS ENUM ('ativo', 'trial', 'expirado', 'cancelado', 'revogado');

-- 1.2 Criar enum para tipo de período
CREATE TYPE public.feature_periodo AS ENUM ('mensal', 'anual', 'vitalicio', 'trial', 'cortesia');

-- 1.3 Criar enum para tipo de transação
CREATE TYPE public.feature_transaction_tipo AS ENUM ('atribuicao', 'revogacao', 'renovacao', 'expiracao', 'trial_inicio', 'trial_fim');

-- 1.4 Criar enum para origem do cliente
CREATE TYPE public.origem_tipo AS ENUM ('lojafy', 'loja', 'importado', 'convite');

-- =============================================
-- TABELA: features (Catálogo de Features)
-- =============================================
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) NOT NULL UNIQUE,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50) DEFAULT 'Sparkles',
  categoria VARCHAR(50) NOT NULL DEFAULT 'geral',
  ordem_exibicao INTEGER DEFAULT 0,
  preco_mensal DECIMAL(10,2),
  preco_anual DECIMAL(10,2),
  preco_vitalicio DECIMAL(10,2),
  trial_dias INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  visivel_catalogo BOOLEAN DEFAULT false,
  roles_permitidas TEXT[] DEFAULT ARRAY['reseller', 'supplier', 'customer'],
  requer_features TEXT[] DEFAULT ARRAY[]::TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- TABELA: user_features (Features dos Usuários)
-- =============================================
CREATE TABLE public.user_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  status feature_status DEFAULT 'ativo',
  tipo_periodo feature_periodo NOT NULL,
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_expiracao TIMESTAMPTZ,
  trial_usado BOOLEAN DEFAULT false,
  origem VARCHAR(50) DEFAULT 'admin',
  atribuido_por UUID REFERENCES auth.users(id),
  motivo TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, feature_id)
);

-- =============================================
-- TABELA: feature_transactions (Histórico)
-- =============================================
CREATE TABLE public.feature_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  tipo feature_transaction_tipo NOT NULL,
  valor DECIMAL(10,2),
  tipo_periodo feature_periodo,
  executado_por UUID REFERENCES auth.users(id),
  motivo TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- ADICIONAR CAMPOS DE ORIGEM NA PROFILES
-- =============================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS origem_tipo origem_tipo DEFAULT 'lojafy',
ADD COLUMN IF NOT EXISTS origem_loja_id UUID,
ADD COLUMN IF NOT EXISTS origem_metadata JSONB DEFAULT '{}';

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX idx_features_slug ON public.features(slug);
CREATE INDEX idx_features_categoria ON public.features(categoria);
CREATE INDEX idx_features_ativo ON public.features(ativo);

CREATE INDEX idx_user_features_user_id ON public.user_features(user_id);
CREATE INDEX idx_user_features_feature_id ON public.user_features(feature_id);
CREATE INDEX idx_user_features_status ON public.user_features(status);
CREATE INDEX idx_user_features_expiracao ON public.user_features(data_expiracao);

CREATE INDEX idx_feature_transactions_user_id ON public.feature_transactions(user_id);
CREATE INDEX idx_feature_transactions_feature_id ON public.feature_transactions(feature_id);

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================
CREATE TRIGGER update_features_updated_at
  BEFORE UPDATE ON public.features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_features_updated_at
  BEFORE UPDATE ON public.user_features
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- FUNÇÕES SQL
-- =============================================

-- Função: Verificar se usuário tem feature ativa
CREATE OR REPLACE FUNCTION public.user_has_feature(_user_id UUID, _feature_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_features uf
    JOIN public.features f ON f.id = uf.feature_id
    WHERE uf.user_id = _user_id
      AND f.slug = _feature_slug
      AND uf.status IN ('ativo', 'trial')
      AND (uf.data_expiracao IS NULL OR uf.data_expiracao > NOW())
  );
$$;

-- Função: Listar features ativas do usuário
CREATE OR REPLACE FUNCTION public.get_user_active_features(_user_id UUID)
RETURNS TABLE (
  feature_id UUID,
  feature_slug TEXT,
  feature_nome TEXT,
  feature_icone TEXT,
  categoria TEXT,
  status feature_status,
  tipo_periodo feature_periodo,
  data_inicio TIMESTAMPTZ,
  data_expiracao TIMESTAMPTZ,
  dias_restantes INTEGER,
  atribuido_por UUID,
  motivo TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.id as feature_id,
    f.slug as feature_slug,
    f.nome as feature_nome,
    f.icone as feature_icone,
    f.categoria,
    uf.status,
    uf.tipo_periodo,
    uf.data_inicio,
    uf.data_expiracao,
    CASE 
      WHEN uf.data_expiracao IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(DAY FROM uf.data_expiracao - NOW())::INTEGER)
    END as dias_restantes,
    uf.atribuido_por,
    uf.motivo
  FROM public.user_features uf
  JOIN public.features f ON f.id = uf.feature_id
  WHERE uf.user_id = _user_id
    AND uf.status IN ('ativo', 'trial')
    AND (uf.data_expiracao IS NULL OR uf.data_expiracao > NOW())
  ORDER BY f.categoria, f.ordem_exibicao;
$$;

-- Função: Verificar com bypass para superadmin
CREATE OR REPLACE FUNCTION public.user_has_feature_or_superadmin(_user_id UUID, _feature_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = _user_id AND role = 'super_admin'
      ) THEN true
      ELSE public.user_has_feature(_user_id, _feature_slug)
    END;
$$;

-- Função: Contar usuários por feature
CREATE OR REPLACE FUNCTION public.get_feature_user_count(_feature_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_features
  WHERE feature_id = _feature_id
    AND status IN ('ativo', 'trial')
    AND (data_expiracao IS NULL OR data_expiracao > NOW());
$$;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Features: Todos podem ver features ativas
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Features visíveis para todos"
  ON public.features FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE POLICY "SuperAdmin gerencia features"
  ON public.features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- User Features: Usuário vê suas próprias, SuperAdmin vê todas
ALTER TABLE public.user_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê suas features"
  ON public.user_features FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "SuperAdmin gerencia user_features"
  ON public.user_features FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Feature Transactions: Apenas SuperAdmin
ALTER TABLE public.feature_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SuperAdmin vê transactions"
  ON public.feature_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "SuperAdmin cria transactions"
  ON public.feature_transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- =============================================
-- SEED DATA: 12 Features Iniciais
-- =============================================
INSERT INTO public.features (slug, nome, descricao, icone, categoria, ordem_exibicao, preco_mensal, preco_anual, preco_vitalicio, trial_dias, roles_permitidas, requer_features) VALUES
-- Loja
('loja_propria', 'Loja Própria', 'Permite criar e gerenciar uma loja personalizada', 'Store', 'loja', 1, 49.90, 479.00, 1499.00, 7, ARRAY['reseller'], ARRAY[]::TEXT[]),
('loja_dominio_custom', 'Domínio Personalizado', 'Usar domínio próprio na loja', 'Globe', 'loja', 2, 29.90, 289.00, 899.00, 0, ARRAY['reseller'], ARRAY['loja_propria']),
('loja_tema_premium', 'Tema Premium', 'Acesso a temas exclusivos para a loja', 'Palette', 'loja', 3, 19.90, 189.00, 599.00, 0, ARRAY['reseller'], ARRAY['loja_propria']),

-- Analytics
('analytics_basico', 'Analytics Básico', 'Métricas básicas de vendas e visitantes', 'BarChart2', 'analytics', 1, 0.00, 0.00, 0.00, 0, ARRAY['reseller', 'supplier'], ARRAY[]::TEXT[]),
('analytics_avancado', 'Analytics Avançado', 'Métricas detalhadas, funil de conversão e relatórios', 'TrendingUp', 'analytics', 2, 39.90, 379.00, 1199.00, 7, ARRAY['reseller', 'supplier'], ARRAY['analytics_basico']),

-- Integrações
('integracao_whatsapp', 'Integração WhatsApp', 'Notificações automáticas via WhatsApp', 'MessageCircle', 'integracoes', 1, 29.90, 289.00, 899.00, 7, ARRAY['reseller', 'supplier'], ARRAY[]::TEXT[]),
('integracao_email', 'Integração E-mail', 'Envio automático de e-mails transacionais', 'Mail', 'integracoes', 2, 19.90, 189.00, 599.00, 7, ARRAY['reseller', 'supplier'], ARRAY[]::TEXT[]),
('integracao_api', 'API de Integração', 'Acesso à API para integrações customizadas', 'Code', 'integracoes', 3, 99.90, 959.00, 2999.00, 0, ARRAY['reseller', 'supplier'], ARRAY[]::TEXT[]),

-- Automação
('automacao_carrinho', 'Recuperação de Carrinho', 'Automação para recuperar carrinhos abandonados', 'ShoppingCart', 'automacao', 1, 49.90, 479.00, 1499.00, 7, ARRAY['reseller'], ARRAY['loja_propria']),

-- Suporte
('suporte_prioritario', 'Suporte Prioritário', 'Atendimento prioritário no suporte', 'HeadphonesIcon', 'suporte', 1, 29.90, 289.00, 899.00, 0, ARRAY['reseller', 'supplier', 'customer'], ARRAY[]::TEXT[]),

-- Academy
('academy_acesso', 'Acesso Academy', 'Acesso aos cursos da plataforma', 'GraduationCap', 'academy', 1, 49.90, 479.00, 1499.00, 0, ARRAY['reseller', 'supplier', 'customer'], ARRAY[]::TEXT[]),
('academy_certificado', 'Certificados', 'Emissão de certificados de conclusão', 'Award', 'academy', 2, 19.90, 189.00, 599.00, 0, ARRAY['reseller', 'supplier', 'customer'], ARRAY['academy_acesso']);