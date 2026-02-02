

# Plano: Corrigir Inconsistência de Permissões

## Problema Identificado

A API Key está sendo criada com a permissão `pedidos.write`, mas o endpoint está verificando `orders.write`.

**No ApiKeyManager (linha 84-88):**
```typescript
permissions: {
  produtos: { read: true, write: true },
  categorias: { read: true, write: true },
  pedidos: { read: true, write: false }  // ← Usa "pedidos"
}
```

**No Edge Function (linha 70):**
```typescript
const hasOrdersWrite = permissions?.orders?.write === true;  // ← Verifica "orders"
```

---

## Solução

Atualizar o Edge Function para verificar `pedidos.write` em vez de `orders.write`, mantendo consistência com o padrão em português já usado no sistema.

---

## Arquivos a Modificar

### 1. Edge Function

**Arquivo:** `supabase/functions/api-pedidos-atualizar-status/index.ts`

**Alteração nas linhas 68-77:**
```typescript
// ANTES
const permissions = keyData.permissions as Record<string, any> || {};
const hasOrdersWrite = permissions?.orders?.write === true;

if (!hasOrdersWrite) {
  return new Response(
    JSON.stringify({ success: false, error: 'Permissão orders.write não concedida' }),

// DEPOIS
const permissions = keyData.permissions as Record<string, any> || {};
const hasPedidosWrite = permissions?.pedidos?.write === true;

if (!hasPedidosWrite) {
  return new Response(
    JSON.stringify({ success: false, error: 'Permissão pedidos.write não concedida' }),
```

### 2. Atualizar Permissões Padrão

**Arquivo:** `src/components/admin/ApiKeyManager.tsx`

**Alteração na linha 87:**
```typescript
// ANTES
pedidos: { read: true, write: false }

// DEPOIS  
pedidos: { read: true, write: true }  // Habilitar escrita por padrão
```

### 3. Atualizar Documentação

**Arquivo:** `src/data/apiEndpointsData.ts`

Atualizar mensagem de erro para refletir `pedidos.write`:
```typescript
// ANTES
{ code: 403, title: 'Sem permissão', description: 'API Key sem permissão orders.write', example: { success: false, error: 'Permissão orders.write não concedida' } }

// DEPOIS
{ code: 403, title: 'Sem permissão', description: 'API Key sem permissão pedidos.write', example: { success: false, error: 'Permissão pedidos.write não concedida' } }
```

---

## Ação Adicional Necessária

Após as alterações, você precisará **atualizar as permissões das API Keys existentes** no banco de dados para incluir `pedidos.write: true`. Isso pode ser feito via SQL:

```sql
UPDATE api_keys 
SET permissions = jsonb_set(
  permissions, 
  '{pedidos,write}', 
  'true'::jsonb
)
WHERE permissions->'pedidos' IS NOT NULL;
```

---

## Resumo de Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/api-pedidos-atualizar-status/index.ts` | Verificar `pedidos.write` em vez de `orders.write` |
| `src/components/admin/ApiKeyManager.tsx` | Habilitar `pedidos.write: true` por padrão |
| `src/data/apiEndpointsData.ts` | Atualizar mensagem de erro na documentação |

