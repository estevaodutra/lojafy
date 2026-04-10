

# Wallet Recharge: Usar mesmo fluxo N8N do checkout

## Problema atual
A edge function `wallet-recharge` chama `create-pix-payment` internamente via `supabase.functions.invoke`. Porém, `create-pix-payment` cria um pedido (`orders`) desnecessário para recargas de carteira. O fluxo correto é chamar o webhook N8N diretamente (mesma URL, mesmo formato de payload) sem criar pedido.

## Solução
Modificar `wallet-recharge` para enviar o payload diretamente ao webhook N8N (mesma lógica de `create-pix-payment`), sem passar por `create-pix-payment`. O `external_reference` com prefixo `wallet_` já garante que o `webhook-n8n-payment` identifique como recarga.

## Arquivo afetado

| Arquivo | Ação |
|---------|------|
| `supabase/functions/wallet-recharge/index.ts` | Substituir chamada a `create-pix-payment` por chamada direta ao N8N webhook |

## Mudanças em `wallet-recharge/index.ts`

1. **Remover** a chamada `supabase.functions.invoke('create-pix-payment', ...)`
2. **Adicionar** chamada direta ao N8N webhook usando o mesmo padrão:
   - Montar payload no formato `{ pedido, cliente, produtos, pagamento }` igual ao `create-pix-payment`
   - Usar URLs `N8N_WEBHOOK_URL` / `N8N_WEBHOOK_TEST_URL` com fallback
   - Timeout de 30s com `AbortController`
   - Fallback de webhook produção → teste (mesmo padrão)
3. **Parsear** resposta N8N: extrair `qrCodeBase64`, `qrCodeCopyPaste`, `paymentId`
4. **Atualizar** a transação pendente com o `payment_id` do N8N
5. **Retornar** QR code e payment_id para o frontend

### Payload para N8N (mesmo formato do checkout)
```typescript
const n8nPayload = {
  pedido: {
    external_reference: `wallet_${transaction.id}`,
    timestamp: new Date().toISOString(),
    valor_total: totalPagar,
    descricao: `Recarga Carteira - R$ ${valor.toFixed(2)}`,
    quantidade_itens: 1
  },
  cliente: {
    user_id: user.id,
    nome_completo: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim(),
    email: user.email,
    telefone: profile?.phone || '',
    cpf: profile?.cpf?.replace(/\D/g, '') || '',
    endereco: null
  },
  produtos: [{
    id: 'wallet-recharge',
    nome: `Recarga Carteira R$ ${valor.toFixed(2)}`,
    preco_unitario: totalPagar,
    quantidade: 1,
    valor_total_item: totalPagar
  }],
  pagamento: {
    metodo: 'pix',
    valor: totalPagar
  }
};
```

O webhook `webhook-n8n-payment` já trata o prefixo `wallet_` no `external_reference` corretamente, portanto nenhuma mudança é necessária nele.

