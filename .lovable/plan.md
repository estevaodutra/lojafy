

# Plano: Vincular Features à Data de Expiração do Usuário

## Contexto da Mudança

Atualmente, cada feature atribuída a um usuário tem sua **própria data de expiração** (`user_features.data_expiracao`). A mudança é para usar a **data de expiração do perfil do usuário** (`profiles.subscription_expires_at`) como única fonte de verdade.

---

## Nova Lógica de Expiração

```text
┌─────────────────────────────────────────────────────────────────┐
│                     ANTES (Atual)                               │
├─────────────────────────────────────────────────────────────────┤
│  user_features.data_expiracao = 2026-02-28 (individual)         │
│  Feature expira quando: data_expiracao < NOW()                  │
└─────────────────────────────────────────────────────────────────┘

                           ▼

┌─────────────────────────────────────────────────────────────────┐
│                      DEPOIS (Novo)                              │
├─────────────────────────────────────────────────────────────────┤
│  profiles.subscription_expires_at = 2026-02-28 (global)         │
│  Feature expira quando: subscription_expires_at < NOW()         │
│  Exceção: tipo_periodo = 'vitalicio' ou 'cortesia' → nunca      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Alterações no Banco de Dados

### 1. Alterar RPC `user_has_feature`

**Lógica Atual:**
```sql
WHERE uf.user_id = _user_id
  AND f.slug = _feature_slug
  AND uf.status IN ('ativo', 'trial')
  AND (uf.data_expiracao IS NULL OR uf.data_expiracao > NOW())
```

**Nova Lógica:**
```sql
WHERE uf.user_id = _user_id
  AND f.slug = _feature_slug
  AND uf.status IN ('ativo', 'trial')
  AND (
    uf.tipo_periodo IN ('vitalicio', 'cortesia')  -- Nunca expira
    OR p.subscription_expires_at IS NULL           -- Sem data = ativo
    OR p.subscription_expires_at > NOW()           -- Data futura = ativo
  )
```

### 2. Alterar RPC `get_user_active_features`

**Lógica Atual:**
```sql
WHERE uf.user_id = _user_id
  AND uf.status IN ('ativo', 'trial')
  AND (uf.data_expiracao IS NULL OR uf.data_expiracao > NOW())
```

**Nova Lógica:**
```sql
FROM public.user_features uf
JOIN public.features f ON f.id = uf.feature_id
JOIN public.profiles p ON p.user_id = uf.user_id
WHERE uf.user_id = _user_id
  AND uf.status IN ('ativo', 'trial')
  AND (
    uf.tipo_periodo IN ('vitalicio', 'cortesia')
    OR p.subscription_expires_at IS NULL
    OR p.subscription_expires_at > NOW()
  )
```

E atualizar o cálculo de `dias_restantes`:
```sql
CASE 
  WHEN uf.tipo_periodo IN ('vitalicio', 'cortesia') THEN NULL
  WHEN p.subscription_expires_at IS NULL THEN NULL
  ELSE GREATEST(0, EXTRACT(DAY FROM p.subscription_expires_at - NOW())::INTEGER)
END as dias_restantes,
p.subscription_expires_at as data_expiracao_perfil
```

---

## Alterações nas Edge Functions

### 3. `atribuir-feature/index.ts`

Remover cálculo de `data_expiracao` individual e simplificar:

```typescript
// REMOVER toda a lógica de cálculo:
// let data_expiracao: string | null = null;
// switch (tipo_periodo) { ... }

// SIMPLIFICAR upsert:
const { data: userFeature, error: upsertError } = await supabase
  .from('user_features')
  .upsert({
    user_id,
    feature_id: feature.id,
    status: tipo_periodo === 'trial' ? 'trial' : 'ativo',
    tipo_periodo,
    data_inicio: new Date().toISOString(),
    data_expiracao: null,  // Não usado mais
    trial_usado: tipo_periodo === 'trial',
    origem: 'admin',
    atribuido_por: caller.id,
    motivo,
  }, {
    onConflict: 'user_id,feature_id',
  })
```

### 4. `api-features-atribuir/index.ts`

Mesma simplificação - remover cálculo de datas individuais.

---

## Alterações no Frontend

### 5. `src/components/admin/AssignFeatureModal.tsx`

Simplificar opções de período (já que não afetam expiração individual):

```typescript
const periodOptions = [
  { value: 'mensal', label: 'Mensal (usa data do perfil)' },
  { value: 'anual', label: 'Anual (usa data do perfil)' },
  { value: 'vitalicio', label: 'Vitalício (não expira)' },
  { value: 'cortesia', label: 'Cortesia (não expira)' },
];
```

Adicionar nota explicativa na interface:
```typescript
<p className="text-xs text-muted-foreground">
  A expiração será controlada pela data de expiração do perfil do usuário.
  Períodos vitalício/cortesia nunca expiram.
</p>
```

### 6. `src/hooks/useUserFeatures.ts`

Atualizar interface para refletir novo campo:

```typescript
export interface UserFeature {
  // ... campos existentes ...
  data_expiracao_perfil: string | null;  // Novo campo
}
```

### 7. Atualizar Documentação API

Em `src/data/apiEndpointsData.ts`, adicionar nota sobre a nova lógica de expiração.

---

## Migration SQL

```sql
-- Alterar função user_has_feature
CREATE OR REPLACE FUNCTION public.user_has_feature(_user_id uuid, _feature_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_features uf
    JOIN public.features f ON f.id = uf.feature_id
    JOIN public.profiles p ON p.user_id = uf.user_id
    WHERE uf.user_id = _user_id
      AND f.slug = _feature_slug
      AND uf.status IN ('ativo', 'trial')
      AND (
        uf.tipo_periodo IN ('vitalicio', 'cortesia')
        OR p.subscription_expires_at IS NULL
        OR p.subscription_expires_at > NOW()
      )
  );
$$;

-- Alterar função get_user_active_features
CREATE OR REPLACE FUNCTION public.get_user_active_features(_user_id uuid)
RETURNS TABLE (
  feature_id uuid,
  feature_slug varchar,
  feature_nome varchar,
  feature_icone varchar,
  categoria varchar,
  status feature_status,
  tipo_periodo feature_period,
  data_inicio timestamptz,
  data_expiracao timestamptz,
  dias_restantes integer,
  atribuido_por uuid,
  motivo text
)
LANGUAGE sql
STABLE SECURITY DEFINER
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
    p.subscription_expires_at as data_expiracao,
    CASE 
      WHEN uf.tipo_periodo IN ('vitalicio', 'cortesia') THEN NULL
      WHEN p.subscription_expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(DAY FROM p.subscription_expires_at - NOW())::INTEGER)
    END as dias_restantes,
    uf.atribuido_por,
    uf.motivo
  FROM public.user_features uf
  JOIN public.features f ON f.id = uf.feature_id
  JOIN public.profiles p ON p.user_id = uf.user_id
  WHERE uf.user_id = _user_id
    AND uf.status IN ('ativo', 'trial')
    AND (
      uf.tipo_periodo IN ('vitalicio', 'cortesia')
      OR p.subscription_expires_at IS NULL
      OR p.subscription_expires_at > NOW()
    )
  ORDER BY f.categoria, f.ordem_exibicao;
$$;
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| **Migration SQL** | Alterar RPCs `user_has_feature` e `get_user_active_features` |
| `supabase/functions/atribuir-feature/index.ts` | Remover cálculo de `data_expiracao` |
| `supabase/functions/api-features-atribuir/index.ts` | Remover cálculo de `data_expiracao` |
| `src/components/admin/AssignFeatureModal.tsx` | Atualizar labels e adicionar nota |
| `src/data/apiEndpointsData.ts` | Atualizar documentação |

---

## Comportamento Final

| Tipo Período | Fonte de Expiração | Comportamento |
|--------------|-------------------|---------------|
| mensal | `profiles.subscription_expires_at` | Expira junto com o perfil |
| anual | `profiles.subscription_expires_at` | Expira junto com o perfil |
| trial | `profiles.subscription_expires_at` | Expira junto com o perfil |
| vitalicio | Nunca | Feature permanente |
| cortesia | Nunca | Feature permanente |

