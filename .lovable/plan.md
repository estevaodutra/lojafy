
# Plano: Corrigir Logs Vazios, Disparos Repetidos e Adicionar Disparo Manual de Webhook

## Diagnóstico Detalhado

### Problema 1: Payload Vazio (items: [], customer: null)

**Causa Raiz:**
- As Edge Functions `check-pending-payments` e `webhook-n8n-payment` usam `product_name_snapshot` que NÃO existe na tabela `order_items`
- O campo correto é `product_snapshot` (JSONB) com estrutura `{name, sku, image_url, ...}`
- O `dispatch-webhook` já faz corretamente: `item.product_snapshot?.name`

**Evidência:**
```sql
-- Colunas reais da tabela order_items:
id, order_id, product_id, quantity, unit_price, total_price, product_snapshot, created_at
-- Não existe product_name_snapshot!
```

### Problema 2: Disparo Repetido

**Causa Raiz:**
- Não há verificação se o pedido já foi processado antes de disparar o webhook
- Se N8N e `check-pending-payments` processarem ao mesmo tempo, ambos disparam

---

## Arquivos a Modificar

### 1. `supabase/functions/check-pending-payments/index.ts`

**Correções:**
- Adicionar select de `product_snapshot` (JSONB)
- Mapear items usando `product_snapshot.name`
- Tratar customer null (pedidos de visitantes)
- Verificar se webhook já foi disparado

### 2. `supabase/functions/webhook-n8n-payment/index.ts`

**Correções:**
- Corrigir mapeamento: `item.product_snapshot?.name`
- Adicionar verificação: `if (orderData.payment_status === 'paid') return`
- Tratar customer null

---

## Novos Arquivos a Criar

### 3. `supabase/functions/dispatch-order-webhook/index.ts`

Nova Edge Function para disparar webhook `order.paid` manualmente de um pedido específico.

**Funcionalidades:**
- Recebe `order_id` como parâmetro
- Busca dados completos do pedido (items com product_snapshot, customer, reseller)
- Verifica se o pedido está pago (`payment_status = 'paid'`)
- Chama o `dispatch-webhook` com payload correto
- Retorna status do disparo

**Endpoint:**
```
POST /functions/v1/dispatch-order-webhook
Body: { "order_id": "uuid-do-pedido" }
```

---

## Arquivos de Frontend a Modificar

### 4. `src/components/OrderDetailsModal.tsx`

**Adicionar:**
- Estado para verificar se webhook foi disparado (`webhookDispatched`)
- Busca na tabela `webhook_dispatch_logs` para verificar se existe log para este pedido
- Badge indicando status do webhook:
  - **Verde**: "Webhook Enviado" + data/hora do último disparo
  - **Amarelo**: "Webhook Pendente" (pedido pago mas sem log)
  - **Cinza**: "N/A" (pedido não pago ainda)
- Botão "Disparar Webhook" (aparece apenas se pedido pago e sem webhook enviado)
- Loading state durante disparo
- Toast de sucesso/erro

**Localização no componente:**
- Após a seção de pagamento
- Na área de informações do pedido

---

## Estrutura da Nova Seção no OrderDetailsModal

```text
┌─────────────────────────────────────────────────────┐
│ 📤 Webhook de Pedido Pago                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Status: [✅ Enviado em 02/02/2026 12:30]           │
│                                                     │
│ ──── OU ────                                        │
│                                                     │
│ Status: [⚠️ Não enviado]                            │
│ [🚀 Disparar Webhook]                               │
│                                                     │
│ ──── OU (se não pago) ────                          │
│                                                     │
│ Status: [⏳ Aguardando pagamento]                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Correções de Código Detalhadas

### Antes (ERRADO):
```typescript
// check-pending-payments e webhook-n8n-payment
items: fullOrder?.order_items?.map((item: any) => ({
  product_id: item.product_id,
  name: item.product_name_snapshot,  // ❌ Campo não existe!
  quantity: item.quantity,
  unit_price: item.unit_price,
})) || [],
```

### Depois (CORRETO):
```typescript
items: fullOrder?.order_items?.map((item: any) => ({
  product_id: item.product_id,
  name: item.product_snapshot?.name || 'Produto',
  sku: item.product_snapshot?.sku || null,
  image_url: item.product_snapshot?.image_url || null,
  quantity: item.quantity,
  unit_price: item.unit_price,
})) || [],
```

### Verificação de Duplicidade:
```typescript
// No webhook-n8n-payment, antes de processar
if (orderData.payment_status === 'paid') {
  console.log('⚠️ Pedido já está pago, ignorando');
  return new Response(
    JSON.stringify({ message: 'Order already paid', order_id: orderData.id }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

---

## Atualização do config.toml

Adicionar nova Edge Function:
```toml
[functions.dispatch-order-webhook]
verify_jwt = false
```

---

## Query para Verificar Webhook no Frontend

```typescript
// Buscar último log de webhook para este pedido
const { data: webhookLog } = await supabase
  .from('webhook_dispatch_logs')
  .select('id, dispatched_at, status_code, error_message')
  .eq('event_type', 'order.paid')
  .contains('payload', { data: { order_id: orderId } })
  .order('dispatched_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## Resumo das Alterações

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `check-pending-payments/index.ts` | Modificar | Corrigir mapeamento items, verificar duplicidade |
| `webhook-n8n-payment/index.ts` | Modificar | Corrigir mapeamento items, verificar `payment_status === 'paid'` |
| `dispatch-order-webhook/index.ts` | Criar | Endpoint para disparo manual de webhook por pedido |
| `supabase/config.toml` | Modificar | Adicionar nova função |
| `OrderDetailsModal.tsx` | Modificar | Adicionar badge + botão de disparo manual |

---

## Fluxo do Disparo Manual

```text
1. Admin abre detalhes do pedido
2. Sistema verifica se existe log de webhook para este order_id
3. Se existe: mostra badge "Enviado" com data/hora
4. Se não existe e pedido está pago: mostra botão "Disparar Webhook"
5. Admin clica no botão
6. Frontend chama POST /functions/v1/dispatch-order-webhook
7. Edge Function busca dados completos e chama dispatch-webhook
8. Toast de sucesso/erro
9. Badge atualiza para "Enviado"
```

---

## Resultado Esperado

1. **Payloads completos** com items, customer e reseller preenchidos corretamente
2. **Sem disparos duplicados** - verificação de status antes de processar
3. **Visibilidade** - Admin sabe se webhook foi enviado ou não
4. **Controle** - Possibilidade de reenviar webhook manualmente se necessário
