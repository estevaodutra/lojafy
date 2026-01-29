
# Plano: Corrigir Atribuição de Features com Dependências

## Problema Identificado

Ao tentar atribuir "Certificados" (`academy_certificado`) a um usuário, ocorre erro porque esta feature requer `academy_acesso` (Acesso Academy) que o usuário não possui.

A edge function valida corretamente e retorna:
```json
{"error": "Feature requer \"academy_acesso\" que o usuário não possui"}
```

Mas o modal não exibe essa mensagem corretamente e permite selecionar features com dependências não satisfeitas.

---

## Dependências das Features

| Feature | Requer |
|---------|--------|
| Certificados | academy_acesso |
| Analytics Avançado | analytics_basico |
| Domínio Personalizado | loja_propria |
| Tema Premium | loja_propria |
| Recuperação de Carrinho | loja_propria |

---

## Alterações

### 1. `src/components/admin/AssignFeatureModal.tsx`

**Melhorar filtragem de features disponíveis:**

Filtrar features cujas dependências o usuário já possui:

```typescript
// Linha 51-54: Modificar filtro
const availableFeatures = features.filter((f) => {
  // Já tem a feature
  if (existingFeatures.includes(f.slug)) return false;
  // Inativa
  if (!f.ativo) return false;
  // Verificar dependências
  if (f.requer_features && f.requer_features.length > 0) {
    const hasAllDeps = f.requer_features.every(dep => 
      existingFeatures.includes(dep)
    );
    if (!hasAllDeps) return false;
  }
  return true;
});
```

**Melhorar tratamento de erro da edge function:**

```typescript
// Linhas 67-77: Modificar handleSubmit
const { data, error } = await supabase.functions.invoke('atribuir-feature', {
  body: { ... },
});

// Checar erro no data (edge function retorna JSON com error)
if (error) {
  throw new Error(error.message);
}

if (data?.error) {
  throw new Error(data.error);
}
```

**Adicionar indicação visual de dependências:**

Mostrar quais features estão disponíveis e quais requerem outras features:

```typescript
// Na listagem de features, agrupar por disponibilidade
{availableFeatures.map((feature) => (
  <SelectItem key={feature.slug} value={feature.slug}>
    {feature.nome}
  </SelectItem>
))}

// Mostrar features bloqueadas (opcional)
{blockedFeatures.length > 0 && (
  <div className="text-xs text-muted-foreground mt-2">
    Features bloqueadas por dependências: {blockedFeatures.map(f => f.nome).join(', ')}
  </div>
)}
```

---

## Resultado Esperado

| Cenário | Comportamento Atual | Comportamento Esperado |
|---------|---------------------|------------------------|
| Usuário sem academy_acesso | Mostra "Certificados" na lista | Esconde "Certificados" da lista |
| Clica em Atribuir | Erro genérico | Não permite selecionar features bloqueadas |
| Erro de dependência | "Edge Function returned..." | Mensagem clara sobre qual feature falta |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/AssignFeatureModal.tsx` | Filtrar dependências + melhorar tratamento de erro |

---

## Fluxo Corrigido

```text
SuperAdmin abre modal "Atribuir Feature"
              ↓
Filtra features: ativas + não possui + dependências satisfeitas
              ↓
    ┌──────────────────────────────────┐
    │ Usuário tem academy_acesso?      │
    │   ✓ Sim → Mostra "Certificados"  │
    │   ✗ Não → Esconde "Certificados" │
    └──────────────────────────────────┘
              ↓
Só exibe features que podem ser atribuídas
```
