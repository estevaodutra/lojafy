

# Plano: Atualizar Lista de Status de Pedidos

## Mudanca Solicitada

Simplificar a lista de status de pedidos para 6 opcoes claras em portugues:

| Status Atual | Novo Status |
|-------------|-------------|
| pending, recebido, em_preparacao, processing, shipped, delivered, cancelled, refunded | pendente, em_preparacao, despachado, finalizado, cancelado, reembolsado |

## Novos Status

| Valor | Descricao |
|-------|-----------|
| `pendente` | Aguardando pagamento/confirmacao |
| `em_preparacao` | Pedido sendo preparado para envio |
| `despachado` | Enviado para entrega |
| `finalizado` | Entregue ao cliente |
| `cancelado` | Pedido cancelado |
| `reembolsado` | Pagamento devolvido |

---

## Arquivos a Modificar

### 1. Edge Function

**Arquivo:** `supabase/functions/api-pedidos-atualizar-status/index.ts`

**Alteracao na linha 8-17:**
```typescript
// ANTES
const VALID_STATUSES = [
  'pending',
  'recebido',
  'em_preparacao',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded'
];

// DEPOIS
const VALID_STATUSES = [
  'pendente',
  'em_preparacao',
  'despachado',
  'finalizado',
  'cancelado',
  'reembolsado'
];
```

### 2. Documentacao da API

**Arquivo:** `src/data/apiEndpointsData.ts`

**Alteracoes no endpoint "Atualizar Status do Pedido" (linhas 153-188):**

1. Atualizar `requestBody.status` de `'shipped'` para `'despachado'`
2. Atualizar `responseExample.data.new_status` de `'shipped'` para `'despachado'`
3. Atualizar `responseExample._status_disponiveis` para a nova lista
4. Atualizar `errorExamples` com a nova lista de status

---

## Resumo de Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/api-pedidos-atualizar-status/index.ts` | Atualizar array `VALID_STATUSES` |
| `src/data/apiEndpointsData.ts` | Atualizar exemplos e lista de status na documentacao |

