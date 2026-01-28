
# Reestruturação do Sistema de Permissões: Role + Features

## Resumo Executivo

Implementar uma arquitetura de permissões flexível que separa:
- **Role** (identidade): super_admin, admin, reseller, supplier, customer
- **Features** (capacidades): loja_propria, analytics_avancado, integracao_whatsapp, etc.

O Superadmin gerencia todas as features e pode atribuir/revogar manualmente para cada usuário. O catálogo de features fica oculto para usuários finais.

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────┐
│                      USUÁRIO                                     │
│  ┌─────────────┐                                                │
│  │    Role     │  Define IDENTIDADE base                        │
│  │  (quem é)   │  super_admin, reseller, supplier, customer     │
│  └──────┬──────┘                                                │
│         │                                                        │
│         ▼                                                        │
│  ┌─────────────┐                                                │
│  │  Features   │  Define CAPACIDADES                            │
│  │(o que pode) │  loja_propria, analytics, whatsapp, api...     │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fase 1: Modelagem do Banco de Dados

### 1.1 Tabela `features` (Catálogo de Features)

```sql
CREATE TABLE public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identificação
  slug VARCHAR(50) UNIQUE NOT NULL,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50),
  
  -- Categorização
  categoria VARCHAR(50) DEFAULT 'geral',
  ordem_exibicao INTEGER DEFAULT 0,
  
  -- Precificação (para futuro uso)
  preco_mensal DECIMAL(10,2) DEFAULT 0,
  preco_anual DECIMAL(10,2) DEFAULT 0,
  preco_vitalicio DECIMAL(10,2),
  
  -- Trial
  trial_dias INTEGER DEFAULT 0,
  
  -- Configuração
  ativo BOOLEAN DEFAULT true,
  visivel_catalogo BOOLEAN DEFAULT false, -- Oculto por padrão
  roles_permitidas TEXT[] DEFAULT ARRAY['reseller'],
  
  -- Dependências
  requer_features TEXT[],
  
  -- Metadata
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_features_slug ON features(slug);
CREATE INDEX idx_features_categoria ON features(categoria);
CREATE INDEX idx_features_ativo ON features(ativo);
```

### 1.2 Tabela `user_features` (Relacionamento Usuário-Feature)

```sql
CREATE TABLE public.user_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'ativo' 
    CHECK (status IN ('ativo', 'trial', 'expirado', 'cancelado', 'revogado')),
  
  -- Período
  tipo_periodo VARCHAR(20) CHECK (tipo_periodo IN ('mensal', 'anual', 'vitalicio', 'trial', 'cortesia')),
  data_inicio TIMESTAMPTZ DEFAULT NOW(),
  data_expiracao TIMESTAMPTZ,
  
  -- Trial
  trial_usado BOOLEAN DEFAULT false,
  
  -- Origem/Auditoria
  origem VARCHAR(50) DEFAULT 'admin', -- admin, compra, trial, cortesia
  atribuido_por UUID REFERENCES auth.users(id),
  motivo TEXT,
  
  -- Metadata
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, feature_id)
);

-- Índices
CREATE INDEX idx_user_features_user ON user_features(user_id);
CREATE INDEX idx_user_features_feature ON user_features(feature_id);
CREATE INDEX idx_user_features_status ON user_features(status);
CREATE INDEX idx_user_features_expiracao ON user_features(data_expiracao) 
  WHERE data_expiracao IS NOT NULL;
```

### 1.3 Tabela `feature_transactions` (Histórico de Ações)

```sql
CREATE TABLE public.feature_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Relacionamentos
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  
  -- Transação
  tipo VARCHAR(30) NOT NULL 
    CHECK (tipo IN ('atribuicao', 'revogacao', 'renovacao', 'expiracao', 'trial_inicio', 'trial_fim')),
  
  -- Valores (para futuro uso com pagamentos)
  valor DECIMAL(10,2),
  tipo_periodo VARCHAR(20),
  
  -- Auditoria
  executado_por UUID REFERENCES auth.users(id),
  motivo TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_feature_transactions_user ON feature_transactions(user_id);
CREATE INDEX idx_feature_transactions_feature ON feature_transactions(feature_id);
CREATE INDEX idx_feature_transactions_tipo ON feature_transactions(tipo);
CREATE INDEX idx_feature_transactions_created ON feature_transactions(created_at DESC);
```

### 1.4 Alteração na Tabela `profiles` (Origem do Cliente)

```sql
-- Adicionar campos de origem
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS origem_tipo VARCHAR(20) DEFAULT 'lojafy',
  ADD COLUMN IF NOT EXISTS origem_loja_id UUID,
  ADD COLUMN IF NOT EXISTS origem_metadata JSONB DEFAULT '{}';

-- Índices
CREATE INDEX idx_profiles_origem_tipo ON profiles(origem_tipo);
CREATE INDEX idx_profiles_origem_loja ON profiles(origem_loja_id) 
  WHERE origem_loja_id IS NOT NULL;
```

### 1.5 Funções de Verificação (Security Definer)

```sql
-- Verificar se usuário tem uma feature específica
CREATE OR REPLACE FUNCTION public.user_has_feature(_user_id UUID, _feature_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_features uf
    JOIN features f ON f.id = uf.feature_id
    WHERE uf.user_id = _user_id
      AND f.slug = _feature_slug
      AND uf.status IN ('ativo', 'trial')
      AND (uf.data_expiracao IS NULL OR uf.data_expiracao > NOW())
      AND f.ativo = true
  );
$$;

-- Listar todas as features ativas de um usuário
CREATE OR REPLACE FUNCTION public.get_user_features(_user_id UUID)
RETURNS TABLE (
  feature_slug TEXT,
  feature_nome TEXT,
  feature_categoria TEXT,
  status TEXT,
  tipo_periodo TEXT,
  data_expiracao TIMESTAMPTZ,
  dias_restantes INTEGER
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    f.slug,
    f.nome,
    f.categoria,
    uf.status,
    uf.tipo_periodo,
    uf.data_expiracao,
    CASE 
      WHEN uf.data_expiracao IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM uf.data_expiracao - NOW())::INTEGER
    END as dias_restantes
  FROM user_features uf
  JOIN features f ON f.id = uf.feature_id
  WHERE uf.user_id = _user_id
    AND uf.status IN ('ativo', 'trial')
    AND (uf.data_expiracao IS NULL OR uf.data_expiracao > NOW())
    AND f.ativo = true
  ORDER BY f.categoria, f.ordem_exibicao;
$$;

-- Superadmin tem todas as features automaticamente
CREATE OR REPLACE FUNCTION public.user_has_feature_or_superadmin(_user_id UUID, _feature_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'super_admin')
        THEN true
      ELSE public.user_has_feature(_user_id, _feature_slug)
    END;
$$;
```

### 1.6 RLS Policies

```sql
-- Features: Leitura para admins, escrita apenas superadmin
ALTER TABLE features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmin can manage features" ON features
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can view features" ON features
  FOR SELECT USING (public.is_admin_user());

-- User Features: Usuários veem as suas, superadmin vê todas
ALTER TABLE user_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own features" ON user_features
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Superadmin can manage all user features" ON user_features
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- Feature Transactions: Leitura para dono e admins
ALTER TABLE feature_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions" ON feature_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Superadmin can manage all transactions" ON feature_transactions
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));
```

---

## Fase 2: Features Iniciais (Seed Data)

```sql
INSERT INTO features (slug, nome, descricao, categoria, icone, ordem_exibicao, roles_permitidas, trial_dias) VALUES
-- Categoria: Loja
('loja_propria', 'Loja Própria', 'Crie sua loja personalizada com domínio próprio', 'loja', 'Store', 1, ARRAY['reseller'], 7),
('loja_dominio_custom', 'Domínio Personalizado', 'Use seu próprio domínio na loja', 'loja', 'Globe', 2, ARRAY['reseller'], 0),
('loja_tema_premium', 'Temas Premium', 'Acesso a temas exclusivos para sua loja', 'loja', 'Palette', 3, ARRAY['reseller'], 0),

-- Categoria: Analytics  
('analytics_basico', 'Analytics Básico', 'Métricas essenciais de vendas e visitas', 'analytics', 'BarChart2', 10, ARRAY['reseller'], 0),
('analytics_avancado', 'Analytics Avançado', 'Relatórios detalhados, funil, cohort', 'analytics', 'TrendingUp', 11, ARRAY['reseller'], 7),

-- Categoria: Integrações
('integracao_whatsapp', 'Integração WhatsApp', 'Notificações automáticas via WhatsApp', 'integracoes', 'MessageCircle', 20, ARRAY['reseller'], 7),
('integracao_email', 'Email Marketing', 'Campanhas e automações de email', 'integracoes', 'Mail', 21, ARRAY['reseller'], 7),
('integracao_api', 'Acesso API', 'Integração via API para automações', 'integracoes', 'Code', 22, ARRAY['reseller', 'supplier'], 0),

-- Categoria: Automação
('automacao_carrinho', 'Recuperação de Carrinho', 'Emails automáticos para carrinhos abandonados', 'automacao', 'ShoppingCart', 30, ARRAY['reseller'], 7),

-- Categoria: Suporte
('suporte_prioritario', 'Suporte Prioritário', 'Atendimento em até 4 horas', 'suporte', 'Headphones', 40, ARRAY['reseller', 'supplier'], 0),

-- Categoria: Academy
('academy_acesso', 'Lojafy Academy', 'Acesso aos cursos e treinamentos', 'academy', 'GraduationCap', 50, ARRAY['reseller'], 0),
('academy_certificado', 'Certificados Academy', 'Emissão de certificados de conclusão', 'academy', 'Award', 51, ARRAY['reseller'], 0);

-- Definir dependências
UPDATE features SET requer_features = ARRAY['loja_propria'] WHERE slug = 'loja_dominio_custom';
UPDATE features SET requer_features = ARRAY['loja_propria'] WHERE slug = 'loja_tema_premium';
UPDATE features SET requer_features = ARRAY['analytics_basico'] WHERE slug = 'analytics_avancado';
```

---

## Fase 3: Backend (Edge Functions)

### 3.1 Edge Function: `verificar-feature`

Verifica se usuário tem acesso a uma feature específica.

```typescript
// supabase/functions/verificar-feature/index.ts
Deno.serve(async (req) => {
  // Verificar autenticação
  // Chamar função user_has_feature_or_superadmin
  // Retornar { tem_acesso: boolean, status?, expira_em? }
});
```

### 3.2 Edge Function: `atribuir-feature`

Superadmin atribui feature a um usuário.

```typescript
// supabase/functions/atribuir-feature/index.ts
// Body: { user_id, feature_slug, tipo_periodo, motivo? }
// Valida dependências, calcula expiração, registra transação
```

### 3.3 Edge Function: `revogar-feature`

Superadmin revoga feature de um usuário.

```typescript
// supabase/functions/revogar-feature/index.ts
// Body: { user_id, feature_slug, motivo? }
// Atualiza status para 'revogado', registra transação
```

### 3.4 Edge Function: `verificar-expiracoes` (Cron)

Executa diariamente para expirar features vencidas.

```typescript
// supabase/functions/verificar-expiracoes/index.ts
// Busca features onde data_expiracao < NOW() e status in (ativo, trial)
// Atualiza status para 'expirado', registra transação
// Envia notificação ao usuário
```

---

## Fase 4: Interface SuperAdmin

### 4.1 Página: Gerenciamento de Features

**Rota:** `/super-admin/features`

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  Features da Plataforma                              [+ Nova Feature]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ 12 Ativas   │  │ 45 Usuários │  │ 3 Expirando │  │ 2 Inativas  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                                         │
│  [Categoria: Todas ▼]    [Status: Ativos ▼]    [🔍 Buscar...]          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🏪 LOJA                                                         │   │
│  │                                                                  │   │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │   │
│  │ │ Loja Própria│  │ Dom. Custom │  │ Temas Prem. │              │   │
│  │ │ 23 usuários │  │ 8 usuários  │  │ 5 usuários  │              │   │
│  │ │ [Ativo]     │  │ [Ativo]     │  │ [Inativo]   │              │   │
│  │ └─────────────┘  └─────────────┘  └─────────────┘              │   │
│  │                                                                  │   │
│  │ 📊 ANALYTICS                                                     │   │
│  │ ...                                                              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Componentes:**
- `src/pages/admin/Features.tsx` - Página principal
- `src/components/admin/FeatureCard.tsx` - Card de cada feature
- `src/components/admin/FeatureFormModal.tsx` - Criar/editar feature
- `src/components/admin/FeatureUsersDrawer.tsx` - Listar usuários com a feature

### 4.2 Seção: Features no Detalhe do Usuário

**Integrar em:** `src/components/admin/UserDetailsModal.tsx`

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  ⚙️ Features do Usuário                          [+ Atribuir Feature]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ 🏪 Loja Própria                                               │     │
│  │ Vitalício • Cortesia • Atribuído por Admin em 15/01/2026     │     │
│  │                                                    [Revogar]  │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ 📊 Analytics Avançado                                         │     │
│  │ Mensal • Expira em 12 dias (10/02/2026)                       │     │
│  │                                        [Renovar] [Revogar]    │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────┐     │
│  │ 💬 Integração WhatsApp                                        │     │
│  │ Trial • Expira em 5 dias (03/02/2026)                         │     │
│  │                                        [Converter] [Revogar]  │     │
│  └───────────────────────────────────────────────────────────────┘     │
│                                                                         │
│  Nenhuma outra feature ativa                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

**Componentes:**
- `src/components/admin/UserFeaturesSection.tsx` - Seção de features no modal
- `src/components/admin/AssignFeatureModal.tsx` - Modal para atribuir feature
- `src/components/admin/FeatureTransactionsDrawer.tsx` - Histórico de transações

---

## Fase 5: Hook Frontend

### 5.1 Hook: `useFeature`

```typescript
// src/hooks/useFeature.ts
export const useFeature = (featureSlug: string) => {
  const { user, profile } = useAuth();
  
  // Superadmin tem todas as features
  const isSuperAdmin = profile?.role === 'super_admin';
  
  const { data, isLoading } = useQuery({
    queryKey: ['user-feature', user?.id, featureSlug],
    queryFn: async () => {
      if (isSuperAdmin) return { tem_acesso: true };
      
      const { data } = await supabase
        .rpc('user_has_feature', { 
          _user_id: user?.id, 
          _feature_slug: featureSlug 
        });
      return { tem_acesso: data };
    },
    enabled: !!user?.id
  });
  
  return {
    hasFeature: isSuperAdmin || data?.tem_acesso || false,
    isLoading
  };
};
```

### 5.2 Hook: `useUserFeatures`

```typescript
// src/hooks/useUserFeatures.ts
export const useUserFeatures = () => {
  const { user } = useAuth();
  
  const { data: features, isLoading } = useQuery({
    queryKey: ['user-features', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .rpc('get_user_features', { _user_id: user?.id });
      return data || [];
    },
    enabled: !!user?.id
  });
  
  const hasFeature = (slug: string) => 
    features?.some(f => f.feature_slug === slug) || false;
  
  return {
    features,
    hasFeature,
    isLoading
  };
};
```

---

## Fase 6: Integração com Componentes Existentes

### 6.1 Proteção de Rotas por Feature

```typescript
// src/components/auth/FeatureRoute.tsx
export const FeatureRoute = ({ 
  feature, 
  children, 
  fallback 
}: { 
  feature: string; 
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) => {
  const { hasFeature, isLoading } = useFeature(feature);
  
  if (isLoading) return <LoadingSpinner />;
  if (!hasFeature) return fallback || <FeatureRequiredModal feature={feature} />;
  
  return <>{children}</>;
};
```

### 6.2 Componente Condicional

```typescript
// Exemplo de uso
<FeatureGate feature="analytics_avancado">
  <AdvancedAnalyticsChart />
</FeatureGate>
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/admin/Features.tsx` | Página de gerenciamento de features |
| `src/components/admin/FeatureCard.tsx` | Card de exibição de feature |
| `src/components/admin/FeatureFormModal.tsx` | Modal criar/editar feature |
| `src/components/admin/FeatureUsersDrawer.tsx` | Drawer listando usuários |
| `src/components/admin/UserFeaturesSection.tsx` | Seção features no UserDetailsModal |
| `src/components/admin/AssignFeatureModal.tsx` | Modal atribuir feature |
| `src/components/admin/FeatureTransactionsDrawer.tsx` | Histórico de transações |
| `src/hooks/useFeature.ts` | Hook verificar feature única |
| `src/hooks/useUserFeatures.ts` | Hook listar todas features do usuário |
| `src/components/auth/FeatureRoute.tsx` | Proteção de rota por feature |
| `src/components/auth/FeatureGate.tsx` | Renderização condicional por feature |
| `supabase/functions/atribuir-feature/index.ts` | Edge function atribuir |
| `supabase/functions/revogar-feature/index.ts` | Edge function revogar |
| `supabase/functions/verificar-expiracoes/index.ts` | Cron de expiração |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layouts/SuperAdminLayout.tsx` | Adicionar menu "Features" |
| `src/components/admin/UserDetailsModal.tsx` | Adicionar seção de features |
| `src/App.tsx` | Adicionar rota `/super-admin/features` |
| `src/hooks/useSubscriptionCheck.ts` | Migrar lógica para features |

---

## Ordem de Implementação

1. **Fase 1**: Criar tabelas e funções no banco de dados (migration)
2. **Fase 2**: Inserir features iniciais (seed)
3. **Fase 3**: Criar edge functions básicas
4. **Fase 4.1**: Página de gerenciamento de features (SuperAdmin)
5. **Fase 4.2**: Seção de features no UserDetailsModal
6. **Fase 5**: Hooks de verificação frontend
7. **Fase 6**: Componentes de proteção (FeatureRoute, FeatureGate)
8. **Fase 7**: Migrar `useSubscriptionCheck` para usar features

---

## Exemplo de Uso Final

```typescript
// Verificar feature em componente
const { hasFeature } = useFeature('loja_propria');

if (hasFeature) {
  // Mostrar funcionalidade da loja
}

// Proteger rota
<Route 
  path="analytics-avancado" 
  element={
    <FeatureRoute feature="analytics_avancado">
      <AdvancedAnalytics />
    </FeatureRoute>
  } 
/>

// Condicional inline
<FeatureGate feature="integracao_whatsapp">
  <WhatsAppConfig />
</FeatureGate>
```
