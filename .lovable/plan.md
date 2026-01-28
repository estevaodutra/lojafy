

# Implementação Completa do Sistema de Roles e Features

## Resumo

Implementar o sistema completo de permissões que separa **Role** (identidade) de **Features** (capacidades), permitindo gestão flexível pelo SuperAdmin.

---

## Estado Atual

| Item | Status |
|------|--------|
| Tabelas no banco (features, user_features, feature_transactions) | Não existe |
| Edge Functions (atribuir-feature, revogar-feature) | Não existe |
| Hooks (useFeature, useUserFeatures, useFeatures) | Não existe |
| Componentes (FeatureGate, FeatureCard, UserFeaturesSection) | Não existe |
| Página Features.tsx | Não existe |
| Menu "Features" no SuperAdminLayout | Não existe |
| Rota /super-admin/features no App.tsx | Não existe |
| Seção Features no UserDetailsModal | Não existe |

---

## Fase 1: Migração do Banco de Dados

Criar as tabelas, funções SQL, RLS e dados iniciais.

### Tabelas a Criar

**1. `features`** - Catálogo de features
- `slug` (identificador único)
- `nome`, `descricao`, `icone`
- `categoria`, `ordem_exibicao`
- `preco_mensal`, `preco_anual`, `preco_vitalicio`
- `trial_dias`
- `ativo`, `visivel_catalogo`
- `roles_permitidas` (array)
- `requer_features` (dependências)

**2. `user_features`** - Features atribuídas aos usuários
- `user_id`, `feature_id`
- `status` (ativo, trial, expirado, cancelado, revogado)
- `tipo_periodo` (mensal, anual, vitalicio, trial, cortesia)
- `data_inicio`, `data_expiracao`
- `atribuido_por`, `motivo`

**3. `feature_transactions`** - Histórico de ações
- `user_id`, `feature_id`
- `tipo` (atribuicao, revogacao, renovacao, expiracao)
- `executado_por`, `motivo`
- `metadata`

### Funções SQL

```sql
-- Verificar se usuário tem feature
user_has_feature(_user_id, _feature_slug) → BOOLEAN

-- Listar features ativas do usuário
get_user_features(_user_id) → TABLE

-- Verificar com bypass para superadmin
user_has_feature_or_superadmin(_user_id, _feature_slug) → BOOLEAN

-- Contar usuários por feature
get_feature_user_count(_feature_id) → INTEGER
```

### Seed Data (12 features iniciais)

| Categoria | Features |
|-----------|----------|
| Loja | loja_propria, loja_dominio_custom, loja_tema_premium |
| Analytics | analytics_basico, analytics_avancado |
| Integrações | integracao_whatsapp, integracao_email, integracao_api |
| Automação | automacao_carrinho |
| Suporte | suporte_prioritario |
| Academy | academy_acesso, academy_certificado |

### Alteração na tabela `profiles`

Adicionar campos de origem:
- `origem_tipo` (lojafy, loja, importado, convite)
- `origem_loja_id` (UUID da loja de origem)
- `origem_metadata` (JSONB com dados adicionais)

---

## Fase 2: Edge Functions

### 2.1 `atribuir-feature`

```typescript
// POST { user_id, feature_slug, tipo_periodo, motivo? }
// 1. Verificar se chamador é super_admin
// 2. Buscar feature pelo slug
// 3. Verificar dependências (requer_features)
// 4. Calcular data_expiracao baseado em tipo_periodo
// 5. Upsert em user_features
// 6. Registrar em feature_transactions
```

### 2.2 `revogar-feature`

```typescript
// POST { user_id, feature_slug, motivo? }
// 1. Verificar se chamador é super_admin
// 2. Atualizar status para 'revogado'
// 3. Registrar em feature_transactions
```

---

## Fase 3: Hooks Frontend

### 3.1 `useFeature.ts` - Verificar feature única

```typescript
export const useFeature = (featureSlug: string) => {
  const { user, profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  
  const { data, isLoading } = useQuery({
    queryKey: ['user-feature', user?.id, featureSlug],
    queryFn: () => supabase.rpc('user_has_feature', {...}),
    enabled: !!user?.id && !isSuperAdmin
  });
  
  return {
    hasFeature: isSuperAdmin || data || false,
    isLoading
  };
};
```

### 3.2 `useUserFeatures.ts` - Listar todas features

```typescript
export const useUserFeatures = (userId?: string) => {
  const { data: features, isLoading } = useQuery({
    queryKey: ['user-features', userId],
    queryFn: () => supabase.rpc('get_user_features', {...})
  });
  
  return { features, hasFeature: (slug) => ..., isLoading };
};
```

### 3.3 `useFeatures.ts` - Gerenciamento (Admin)

```typescript
export const useFeatures = () => {
  // Query todas features
  // Mutation criar/editar
  // Mutation toggle ativo
  // Query métricas
};
```

---

## Fase 4: Componentes de Controle de Acesso

### 4.1 `FeatureGate.tsx`

Renderiza conteúdo apenas se usuário tem a feature.

```typescript
<FeatureGate feature="analytics_avancado">
  <AdvancedAnalyticsChart />
</FeatureGate>
```

### 4.2 `FeatureRoute.tsx`

Protege rotas por feature.

```typescript
<FeatureRoute feature="loja_propria">
  <StoreEditor />
</FeatureRoute>
```

---

## Fase 5: Interface SuperAdmin - Gerenciamento de Features

### 5.1 Página `/super-admin/features`

```text
┌─────────────────────────────────────────────────────────────────┐
│  Features da Plataforma                      [+ Nova Feature]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐   │
│  │ 12 Ativas │  │ 45 Users  │  │ 3 Expira  │  │ 2 Inativas│   │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘   │
│                                                                 │
│  [Categoria ▼]    [Status ▼]    [🔍 Buscar...]                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🏪 LOJA                                                 │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐                 │   │
│  │  │Loja Próp│  │Dom.Custo│  │Tema Prem│                 │   │
│  │  │23 users │  │8 users  │  │5 users  │                 │   │
│  │  └─────────┘  └─────────┘  └─────────┘                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Componentes:
- `FeatureCard.tsx` - Card de cada feature
- `FeatureFormModal.tsx` - Criar/editar feature

---

## Fase 6: Seção Features no UserDetailsModal

### 6.1 `UserFeaturesSection.tsx`

```text
┌─────────────────────────────────────────────────────────────────┐
│  ⚙️ Features do Usuário                    [+ Atribuir Feature] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 🏪 Loja Própria                                           │ │
│  │ Vitalício • Cortesia • Por Admin em 15/01/2026           │ │
│  │                                              [Revogar]    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ 📊 Analytics Avançado                                     │ │
│  │ Mensal • Expira em 12 dias (10/02/2026)                   │ │
│  │                                    [Renovar] [Revogar]    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 `AssignFeatureModal.tsx`

- Select de features disponíveis
- Select de período (mensal, anual, vitalício)
- Campo de motivo (opcional)

---

## Fase 7: Atualização de Arquivos Existentes

### 7.1 `SuperAdminLayout.tsx`

Adicionar menu "Features":

```typescript
import { Sparkles } from 'lucide-react';

const superAdminMenuItems = [
  // ... existentes ...
  {
    title: 'Features',
    url: '/super-admin/features',
    icon: Sparkles,
  },
];
```

### 7.2 `App.tsx`

Adicionar rota:

```typescript
import Features from "./pages/admin/Features";

// Em /super-admin:
<Route path="features" element={<Features />} />
```

### 7.3 `UserDetailsModal.tsx`

Adicionar seção de features após a seção de pedidos.

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/pages/admin/Features.tsx` | Página de gerenciamento |
| `src/components/admin/FeatureCard.tsx` | Card de feature |
| `src/components/admin/FeatureFormModal.tsx` | Modal criar/editar |
| `src/components/admin/UserFeaturesSection.tsx` | Seção no modal usuário |
| `src/components/admin/AssignFeatureModal.tsx` | Modal atribuir feature |
| `src/components/auth/FeatureGate.tsx` | Renderização condicional |
| `src/components/auth/FeatureRoute.tsx` | Proteção de rota |
| `src/hooks/useFeature.ts` | Hook verificar feature |
| `src/hooks/useUserFeatures.ts` | Hook listar features |
| `src/hooks/useFeatures.ts` | Hook gerenciamento |
| `supabase/functions/atribuir-feature/index.ts` | Edge function |
| `supabase/functions/revogar-feature/index.ts` | Edge function |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layouts/SuperAdminLayout.tsx` | Adicionar menu "Features" |
| `src/App.tsx` | Adicionar rota `/super-admin/features` |
| `src/components/admin/UserDetailsModal.tsx` | Adicionar seção features |
| `supabase/config.toml` | Registrar novas edge functions |

---

## Ordem de Execução

1. **Migração SQL** - Tabelas, funções, RLS, seed
2. **Edge Functions** - atribuir-feature, revogar-feature
3. **Hooks** - useFeature, useUserFeatures, useFeatures
4. **Componentes** - FeatureGate, FeatureRoute, FeatureCard
5. **Página Features.tsx** - UI de gerenciamento
6. **UserFeaturesSection** - Integração no modal
7. **Atualizar arquivos** - Layout, rotas

