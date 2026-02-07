

# Corrigir Webhook de Pedido Pago: Deduplicacao e Intervalo de 1 Minuto

## Problema Identificado

Analisando os logs de `webhook_dispatch_logs`, encontrei duplicatas claras:

```text
Pedido ORD-..._865529AC  -> 13 disparos (ao longo de 9 horas!)
Pedido ORD-..._0492ACDE  ->  4 disparos (em ~1 minuto)
Pedido ORD-..._0492ACDE  ->  2 disparos (no mesmo segundo!)
Pedido ORD-..._865529AC  ->  2 disparos (no mesmo segundo!)
```

Existem **3 causas** independentes:

### Causa 1: Race condition no `webhook-n8n-payment`
O N8N envia o mesmo webhook 2x quase simultaneamente. Ambas requisicoes leem `payment_status = 'pending'` antes de qualquer uma atualizar, passando pela verificacao de idempotencia (linha 100).

### Causa 2: Bug no `check-pending-payments` 
Linha 129: `if (newStatus !== 'pending')` -- para pagamentos aprovados, `newStatus = 'pending'`, entao essa condicao e **sempre falsa**. O bloco que atualiza o pedido e dispara o webhook **nunca executa** para aprovados. Isso faz o pedido ficar eternamente "pendente" no banco, e o cron reencontra ele a cada execucao.

### Causa 3: Sem deduplicacao no `dispatch-webhook`
A funcao central de disparo nao verifica se o mesmo evento ja foi disparado recentemente para o mesmo pedido.

---

## Solucao (3 partes)

### 1. Deduplicacao no `dispatch-webhook` (protecao central)

**Arquivo:** `supabase/functions/dispatch-webhook/index.ts`

Antes de enviar o webhook `order.paid`, consultar a tabela `webhook_dispatch_logs` para verificar se ja existe um disparo para o mesmo `order_id` nos ultimos 60 segundos. Se existir, retornar sucesso sem disparar novamente.

Adicionar esta verificacao logo apos validar que o webhook esta ativo e tem URL configurada (apos a linha 354), e apenas para eventos que nao sejam testes:

```typescript
// Deduplicacao: verificar se order.paid ja foi disparado para este pedido nos ultimos 60 segundos
if (event_type === 'order.paid' && !is_test && payload?.order_id) {
  const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
  
  const { data: recentDispatch } = await supabase
    .from('webhook_dispatch_logs')
    .select('id, dispatched_at')
    .eq('event_type', 'order.paid')
    .gte('dispatched_at', oneMinuteAgo)
    .limit(10);
  
  // Filtrar por order_id no payload (JSONB)
  const duplicateFound = recentDispatch?.find(
    (log: any) => log.payload?.data?.order_id === payload.order_id
  );
  
  if (duplicateFound) {
    console.log(`[dispatch-webhook] Deduplicacao: order.paid para ${payload.order_id} ja disparado ha menos de 60s`);
    return new Response(
      JSON.stringify({ 
        success: true, 
        deduplicated: true,
        message: 'Webhook ja disparado recentemente para este pedido' 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}
```

Como a filtragem por campo JSONB via `.filter()` pode nao funcionar corretamente no Supabase client, a alternativa e buscar os logs recentes e filtrar em memoria pelo `order_id` no payload.

### 2. Update atomico no `webhook-n8n-payment` (prevenir race condition)

**Arquivo:** `supabase/functions/webhook-n8n-payment/index.ts`

Substituir a verificacao de leitura + update separados por um update atomico com clausula WHERE que garante que apenas UMA requisicao consegue atualizar:

Na secao de update do pedido (linhas 150-170), mudar de:
```typescript
// Atual: leitura -> verificacao -> update (vulneravel a race condition)
const { error: updateError } = await supabase
  .from('orders')
  .update({ status: newStatus, payment_status: paymentStatus, ... })
  .eq('id', orderData.id);
```

Para:
```typescript
// Novo: update atomico - so atualiza se payment_status ainda nao e 'paid'
const { data: updatedOrder, error: updateError } = await supabase
  .from('orders')
  .update({ status: newStatus, payment_status: paymentStatus, updated_at: new Date().toISOString() })
  .eq('id', orderData.id)
  .neq('payment_status', 'paid')
  .select('id')
  .maybeSingle();

if (!updatedOrder) {
  console.log('Order already updated by another process, skipping webhook dispatch');
  return new Response(
    JSON.stringify({ success: true, message: 'Already processed' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

Isso garante que se duas requisicoes chegam ao mesmo tempo, apenas a primeira que executar o UPDATE conseguira modificar o registro (a segunda nao encontra nenhuma linha com `payment_status != 'paid'`).

### 3. Corrigir bug no `check-pending-payments`

**Arquivo:** `supabase/functions/check-pending-payments/index.ts`

**Linha 129:** Mudar a condicao de:
```typescript
if (newStatus !== 'pending') {
```

Para:
```typescript
if (newPaymentStatus !== 'pending') {
```

Isso garante que pedidos aprovados (onde `newPaymentStatus = 'paid'`) sejam corretamente atualizados no banco. Sem essa correcao, o cron reencontra o mesmo pedido pendente infinitamente.

Alem disso, dentro deste bloco, aplicar o mesmo padrao de update atomico:
```typescript
const { data: updatedOrder, error: updateError } = await supabase
  .from('orders')
  .update({ status: newStatus, payment_status: newPaymentStatus, updated_at: new Date().toISOString() })
  .eq('id', order.id)
  .neq('payment_status', 'paid')
  .select('id')
  .maybeSingle();

if (!updatedOrder) {
  console.log('Order already processed, skipping');
  continue;
}
```

---

## Resumo das protecoes

```text
Camada 1: webhook-n8n-payment     -> Update atomico (neq payment_status paid)
Camada 2: check-pending-payments   -> Corrigir bug + Update atomico
Camada 3: dispatch-webhook         -> Deduplicacao por order_id (intervalo 60s)
```

Cada camada funciona independentemente, garantindo que mesmo se uma falhar, as outras previnem duplicatas.

