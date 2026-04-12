

# Cancelar Recargas de Carteira Pendentes após 1 Hora

## Problema
Recargas de carteira que não foram pagas permanecem com status `pending` indefinidamente na tabela `wallet_transactions`. Atualmente há 1 recarga pendente desde 10/04.

## Solução
Adicionar lógica de cancelamento automático de `wallet_transactions` pendentes com mais de 1 hora na edge function `check-pending-payments`, que já é executada periodicamente para verificar pedidos.

## Implementação

### Arquivo: `supabase/functions/check-pending-payments/index.ts`

Adicionar um bloco após a verificação de pedidos pendentes que:

1. Busca `wallet_transactions` com `status = 'pending'` e `created_at < NOW() - INTERVAL '1 hour'`
2. Atualiza o status para `cancelled`
3. Loga quantas recargas foram canceladas

### Mudança no código

No final da função `check-pending-payments`, antes do return final, inserir:

```typescript
// Cancel expired wallet recharges (pending > 1 hour)
const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const { data: expiredRecharges, error: rechargeError } = await supabase
  .from('wallet_transactions')
  .update({ status: 'cancelled' })
  .eq('status', 'pending')
  .eq('tipo', 'recarga')
  .lt('created_at', oneHourAgo)
  .select('id');

const cancelledCount = expiredRecharges?.length || 0;
if (cancelledCount > 0) {
  console.log(`🗑️ ${cancelledCount} recarga(s) de carteira expirada(s) cancelada(s)`);
}
```

### Resultado
- Recargas pendentes por mais de 1 hora serão automaticamente marcadas como `cancelled`
- Roda junto com a verificação de pedidos existente (sem nova function)
- A recarga pendente atual (de 10/04) será cancelada na próxima execução

