
# Implementação Completa: Sistema de Permissões Role + Features

## Resumo da Implementação

Este plano detalha todas as fases necessárias para implementar o novo sistema de permissões que separa **Role** (identidade) de **Features** (capacidades), permitindo gestão flexível pelo SuperAdmin.

---

## Fase 1: Migração do Banco de Dados

### 1.1 Novas Tabelas

**Tabela `features`** - Catálogo de features disponíveis:
- `slug` (identificador único)
- `nome`, `descricao`, `icone`
- `categoria`, `ordem_exibicao`
- `preco_mensal`, `preco_anual`, `preco_vitalicio`
- `trial_dias`
- `ativo`, `visivel_catalogo`
- `roles_permitidas` (array)
- `requer_features` (dependências)

**Tabela `user_features`** - Relacionamento usuário-feature:
- `user_id`, `feature_id`
- `status` (ativo, trial, expirado, cancelado, revogado)
- `tipo_periodo` (mensal, anual, vitalicio, trial, cortesia)
- `data_inicio`, `data_expiracao`
- `atribuido_por`, `motivo`

**Tabela `feature_transactions`** - Histórico de ações:
- `user_id`, `feature_id`
- `tipo` (atribuicao, revogacao, renovacao, expiracao)
- `executado_por`, `motivo`
- `metadata`

### 1.2 Funções SQL

```sql
-- Verificar se usuário tem feature
user_has_feature(_user_id, _feature_slug) → BOOLEAN

-- Listar features do usuário
get_user_features(_user_id) → TABLE

-- Verificar com bypass para superadmin
user_has_feature_or_superadmin(_user_id, _feature_slug) → BOOLEAN

-- Contar usuários por feature
get_feature_user_count(_feature_id) → INTEGER
```

### 1.3 RLS Policies
- Superadmin: gerencia tudo
- Admins: visualizam features
- Usuários: veem apenas suas próprias features

### 1.4 Seed Data (12 features iniciais)

| Categoria | Features |
|-----------|----------|
| Loja | loja_propria, loja_dominio_custom, loja_tema_premium |
| Analytics | analytics_basico, analytics_avancado |
| Integrações | integracao_whatsapp, integracao_email, integracao_api |
| Automação | automacao_carrinho |
| Suporte | suporte_prioritario |
| Academy | academy_acesso, academy_certificado |

---

## Fase 2: Edge Functions

### 2.1 `atribuir-feature`
Permite ao SuperAdmin atribuir uma feature a um usuário.

**Arquivo:** `supabase/functions/atribuir-feature/index.ts`

```typescript
// POST { user_id, feature_slug, tipo_periodo, motivo? }
// Valida dependências
// Calcula data_expiracao baseado em tipo_periodo
// Insere em user_features com upsert
// Registra em feature_transactions
// Retorna { success: true, userFeature }
```

### 2.2 `revogar-feature`
Permite ao SuperAdmin revogar uma feature de um usuário.

**Arquivo:** `supabase/functions/revogar-feature/index.ts`

```typescript
// POST { user_id, feature_slug, motivo? }
// Atualiza status para 'revogado'
// Registra em feature_transactions
// Retorna { success: true }
```

---

## Fase 3: Hooks Frontend

### 3.1 `useFeature` - Verificar feature única

**Arquivo:** `src/hooks/useFeature.ts`

```typescript
export const useFeature = (featureSlug: string) => {
  const { user, profile } = useAuth();
  const isSuperAdmin = profile?.role === 'super_admin';
  
  const { data, isLoading } = useQuery({
    queryKey: ['user-feature', user?.id, featureSlug],
    queryFn: async () => {
      if (isSuperAdmin) return { tem_acesso: true };
      const { data } = await supabase.rpc('user_has_feature', {...});
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

### 3.2 `useUserFeatures` - Listar todas features

**Arquivo:** `src/hooks/useUserFeatures.ts`

```typescript
export const useUserFeatures = () => {
  const { user } = useAuth();
  
  const { data: features, isLoading } = useQuery({
    queryKey: ['user-features', user?.id],
    queryFn: () => supabase.rpc('get_user_features', {...}),
    enabled: !!user?.id
  });
  
  const hasFeature = (slug: string) => 
    features?.some(f => f.feature_slug === slug) || false;
  
  return { features, hasFeature, isLoading };
};
```

### 3.3 `useFeatures` - Gerenciamento (SuperAdmin)

**Arquivo:** `src/hooks/useFeatures.ts`

```typescript
// Query para listar todas features
// Mutation para criar/editar feature
// Mutation para toggle ativo
// Query para métricas
```

---

## Fase 4: Componentes de Controle de Acesso

### 4.1 `FeatureGate` - Renderização condicional

**Arquivo:** `src/components/auth/FeatureGate.tsx`

```typescript
export const FeatureGate = ({ 
  feature, 
  children, 
  fallback 
}: Props) => {
  const { hasFeature, isLoading } = useFeature(feature);
  
  if (isLoading) return <Skeleton />;
  if (!hasFeature) return fallback || null;
  
  return <>{children}</>;
};
```

### 4.2 `FeatureRoute` - Proteção de rotas

**Arquivo:** `src/components/auth/FeatureRoute.tsx`

```typescript
export const FeatureRoute = ({ 
  feature, 
  children 
}: Props) => {
  const { hasFeature, isLoading } = useFeature(feature);
  
  if (isLoading) return <LoadingSpinner />;
  if (!hasFeature) return <FeatureRequiredModal feature={feature} />;
  
  return <>{children}</>;
};
```

---

## Fase 5: Interface SuperAdmin - Gerenciamento de Features

### 5.1 Página Principal

**Arquivo:** `src/pages/admin/Features.tsx`

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
│  │                                                         │   │
│  │ 📊 ANALYTICS                                            │   │
│  │  ...                                                    │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Componentes

| Arquivo | Descrição |
|---------|-----------|
| `FeatureCard.tsx` | Card de cada feature com métricas |
| `FeatureFormModal.tsx` | Modal para criar/editar feature |
| `FeatureUsersDrawer.tsx` | Drawer listando usuários com a feature |

---

## Fase 6: Seção Features no UserDetailsModal

### 6.1 Novo Componente

**Arquivo:** `src/components/admin/UserFeaturesSection.tsx`

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
│  │ Mensal • Expira em 12 dias                                │ │
│  │                                    [Renovar] [Revogar]    │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Modal de Atribuição

**Arquivo:** `src/components/admin/AssignFeatureModal.tsx`

- Select de features disponíveis
- Select de período (mensal, anual, vitalício)
- Campo de motivo (opcional)
- Validação de dependências

---

## Fase 7: Atualização de Arquivos Existentes

### 7.1 SuperAdminLayout.tsx

Adicionar item de menu "Features":

```typescript
const superAdminMenuItems = [
  // ... existentes
  {
    title: 'Features',
    url: '/super-admin/features',
    icon: Sparkles,
  },
];
```

### 7.2 App.tsx

Adicionar rota:

```typescript
<Route path="features" element={<Features />} />
```

### 7.3 UserDetailsModal.tsx

Adicionar seção de features:

```typescript
import { UserFeaturesSection } from './UserFeaturesSection';

// No JSX, após a seção de pedidos:
<UserFeaturesSection userId={user.user_id} />
```

---

## Arquivos a Criar

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/pages/admin/Features.tsx` | Página | Gerenciamento de features |
| `src/components/admin/FeatureCard.tsx` | Componente | Card de feature |
| `src/components/admin/FeatureFormModal.tsx` | Componente | Criar/editar feature |
| `src/components/admin/FeatureUsersDrawer.tsx` | Componente | Usuários com feature |
| `src/components/admin/UserFeaturesSection.tsx` | Componente | Features no modal de usuário |
| `src/components/admin/AssignFeatureModal.tsx` | Componente | Atribuir feature |
| `src/components/auth/FeatureGate.tsx` | Componente | Renderização condicional |
| `src/components/auth/FeatureRoute.tsx` | Componente | Proteção de rota |
| `src/hooks/useFeature.ts` | Hook | Verificar feature única |
| `src/hooks/useUserFeatures.ts` | Hook | Listar features do usuário |
| `src/hooks/useFeatures.ts` | Hook | Gerenciamento (admin) |
| `supabase/functions/atribuir-feature/index.ts` | Edge Function | Atribuir feature |
| `supabase/functions/revogar-feature/index.ts` | Edge Function | Revogar feature |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layouts/SuperAdminLayout.tsx` | Adicionar menu "Features" |
| `src/components/admin/UserDetailsModal.tsx` | Adicionar seção de features |
| `src/App.tsx` | Adicionar rota `/super-admin/features` |

---

## Ordem de Execução

1. **Migração SQL** - Criar tabelas, funções, RLS, seed data
2. **Edge Functions** - atribuir-feature, revogar-feature
3. **Hooks** - useFeature, useUserFeatures, useFeatures
4. **Componentes de Controle** - FeatureGate, FeatureRoute
5. **Página Features** - UI de gerenciamento
6. **UserFeaturesSection** - Integração no modal de usuário
7. **Atualizar arquivos existentes** - Layout, rotas
