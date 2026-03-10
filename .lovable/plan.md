

# Fix: Ocultar botão Mercado Livre para produtos inativos

## Problema
O botão "Mercado Livre" aparece para todos os produtos, mesmo os inativos. Só deveria aparecer para produtos com `product.active === true`.

## Solução

### `src/pages/reseller/Products.tsx`
Adicionar a condição `product.active` ao bloco que renderiza o `MercadoLivreButton`:

```tsx
// De:
{hasActiveIntegration && product.product && (

// Para:
{hasActiveIntegration && product.active && product.product && (
```

Uma única linha alterada.

