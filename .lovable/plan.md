
# Corrigir: Etiqueta obrigatória para checkout com método "Envio com Etiqueta"

## Problema

Os 3 pedidos (`ORD-1775783958721`, `ORD-1775782016603`, `ORD-1775781630051`) foram criados e pagos sem etiqueta (`has_shipping_file: false`), apesar do único método de envio ativo ("Envio com Etiqueta") ter `requires_upload: true`.

A validação `canAdvanceToNextStep` no step 2 verifica `shippingFile`, mas a função `createPixPayment` (que cria o pedido) **não re-valida** a presença do arquivo antes de prosseguir. Se o estado `shippingFile` for perdido (ex: re-render, navegação entre steps), o pedido é criado sem etiqueta.

## Correções

### 1. `src/pages/Checkout.tsx` — Validação no `createPixPayment`

Adicionar verificação **antes** de criar o pagamento PIX:

```typescript
// Dentro de createPixPayment, antes de chamar createModernPixPayment
if (isLabelMethod() && selectedShippingMethod?.requires_upload && !shippingFile) {
  toast({
    title: "Etiqueta obrigatória",
    description: "Por favor, anexe a etiqueta de envio antes de finalizar o pedido.",
    variant: "destructive"
  });
  setIsProcessingPayment(false);
  return;
}
```

### 2. `src/pages/Checkout.tsx` — Marcar `has_shipping_file` na criação

Atualizar o pedido para `has_shipping_file: true` somente após upload bem-sucedido (já faz isso na seção de upload). Mas adicionar fallback: se upload falhar e `requires_upload` era `true`, cancelar/alertar.

### 3. Botão de pagamento — Desabilitar sem etiqueta

No botão "Gerar PIX" (step 3/4), desabilitar quando `isLabelMethod() && requires_upload && !shippingFile`.

## Arquivo afetado

| Arquivo | Ação |
|---------|------|
| `src/pages/Checkout.tsx` | Adicionar validação de etiqueta em `createPixPayment` e desabilitar botão |
