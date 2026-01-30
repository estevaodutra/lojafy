

# Plano: Simplificar Corpo de Requisição do Endpoint de Atribuição

## Objetivo

Simplificar o corpo da requisição conforme especificado:

```json
{
  "user_id": "uuid-usuario",
  "feature_id": "",
  "all_features": true
}
```

---

## Regras de Negócio

| Parâmetro | Obrigatório | Comportamento |
|-----------|-------------|---------------|
| `user_id` | Sim | UUID do usuário |
| `feature_id` | Não | UUID da feature (opcional se `all_features: true`) |
| `all_features` | Não | Se `true`, atribui todas as features ativas |
| `tipo_periodo` | Não | Default: usa o plano da assinatura do perfil ou "mensal" |
| `motivo` | Não | Motivo opcional para auditoria |

---

## Alterações Técnicas

### 1. Edge Function: `api-features-atribuir/index.ts`

**Linha 64 - Novo parse do body:**
```typescript
const { user_id, feature_id, feature_slug, all_features, tipo_periodo, motivo } = await req.json();
```

**Linhas 66-86 - Nova validação:**
```typescript
// user_id é sempre obrigatório
if (!user_id) {
  return erro('user_id é obrigatório');
}

// Se não for all_features, precisa de feature_id ou feature_slug
if (!all_features && !feature_id && !feature_slug) {
  return erro('feature_id é obrigatório (ou use all_features: true)');
}

// tipo_periodo é opcional - default para 'mensal' se não informado
const tipoPeriodoFinal = tipo_periodo || 'mensal';
```

**Após linha 100 - Lógica all_features:**
```typescript
if (all_features === true) {
  // 1. Buscar todas features ativas
  const { data: allFeatures } = await supabase
    .from('features')
    .select('*')
    .eq('ativo', true)
    .order('ordem_exibicao');

  // 2. Buscar features que usuário já possui (ativas)
  const { data: existingFeatures } = await supabase
    .from('user_features')
    .select('feature_id')
    .eq('user_id', user_id)
    .in('status', ['ativo', 'trial']);

  const existingIds = new Set(existingFeatures?.map(f => f.feature_id) || []);

  // 3. Processar cada feature
  const assignedFeatures = [];
  const skippedExisting = [];
  const skippedDependencies = [];

  for (const feat of allFeatures) {
    // Já possui?
    if (existingIds.has(feat.id)) {
      skippedExisting.push({ id: feat.id, slug: feat.slug, nome: feat.nome });
      continue;
    }
    
    // Verificar dependências
    if (feat.requer_features?.length > 0) {
      let hasDeps = true;
      for (const reqSlug of feat.requer_features) {
        const { data: hasReq } = await supabase.rpc('user_has_feature', {
          _user_id: user_id,
          _feature_slug: reqSlug,
        });
        if (!hasReq && !existingIds.has(/* id da feature requerida */)) {
          hasDeps = false;
          break;
        }
      }
      if (!hasDeps) {
        skippedDependencies.push({ slug: feat.slug, nome: feat.nome, requer: feat.requer_features });
        continue;
      }
    }

    // Atribuir feature
    await supabase.from('user_features').upsert({...});
    assignedFeatures.push({ id: feat.id, slug: feat.slug, nome: feat.nome });
  }

  // 4. Retornar resultado consolidado
  return Response({ 
    total_assigned: assignedFeatures.length,
    assigned_features: assignedFeatures,
    skipped_existing: skippedExisting.length,
    skipped_dependencies 
  });
}
```

**Linhas 102-114 - Busca por feature_id (prioridade sobre slug):**
```typescript
let feature;
if (feature_id) {
  const { data } = await supabase
    .from('features')
    .select('*')
    .eq('id', feature_id)
    .maybeSingle();
  feature = data;
} else if (feature_slug) {
  const { data } = await supabase
    .from('features')
    .select('*')
    .eq('slug', feature_slug)
    .maybeSingle();
  feature = data;
}
```

---

### 2. Documentação: `src/data/apiEndpointsData.ts`

**Atualizar requestBody e responseExample do endpoint "Atribuir Feature":**

**Request Body (atribuição individual):**
```json
{
  "user_id": "uuid-do-usuario",
  "feature_id": "uuid-da-feature"
}
```

**Request Body (todas as features):**
```json
{
  "user_id": "uuid-do-usuario",
  "feature_id": "",
  "all_features": true
}
```

**Response (all_features):**
```json
{
  "success": true,
  "message": "3 features atribuídas com sucesso",
  "data": {
    "total_assigned": 3,
    "assigned_features": [
      { "id": "uuid", "slug": "loja_propria", "nome": "Loja Completa" }
    ],
    "skipped_existing": 1,
    "skipped_dependencies": []
  }
}
```

---

## Exemplos de Uso

**Atribuir feature específica por ID:**
```json
POST /functions/v1/api-features-atribuir
{
  "user_id": "uuid-usuario",
  "feature_id": "uuid-feature"
}
```

**Atribuir todas as features:**
```json
POST /functions/v1/api-features-atribuir
{
  "user_id": "uuid-usuario",
  "feature_id": "",
  "all_features": true
}
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/api-features-atribuir/index.ts` | Adicionar `feature_id`, `all_features`, tornar `tipo_periodo` opcional |
| `src/data/apiEndpointsData.ts` | Atualizar documentação com novos parâmetros |

