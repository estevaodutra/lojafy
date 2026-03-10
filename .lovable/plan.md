

# Fix: Ocultar botão ML para produtos sem habilitação no Mercado Livre

## Problema
O botão "Mercado Livre" aparece para todos os produtos ativos, mesmo os que **não têm dados de marketplace** configurados. No banco, a tabela `product_marketplace_data` indica quais produtos estão habilitados para ML (`listing_status = 'ready'`). O produto "Cinta Emagrecedora" da screenshot não tem entrada nesta tabela, mas o botão aparece.

## Solução

### 1. `src/hooks/useResellerStore.ts` — Incluir `product_marketplace_data` na query
Adicionar o join com `product_marketplace_data` dentro do select dos produtos para trazer os dados de marketplace junto:

```sql
products!reseller_products_product_id_fkey (
  ...,
  product_marketplace_data(id, marketplace, listing_status)
)
```

### 2. `src/pages/reseller/Products.tsx` — Condicionar botão ML
Alterar a condição de exibição do `MercadoLivreButton` para verificar se o produto possui entrada na `product_marketplace_data` com `marketplace = 'mercadolivre'`:

```tsx
// De:
{hasActiveIntegration && product.active && product.product && (

// Para:
{hasActiveIntegration && product.active && product.product && 
 product.product.product_marketplace_data?.some(
   (mp: any) => mp.marketplace === 'mercadolivre'
 ) && (
```

Isso garante que o botão só aparece para produtos que o admin habilitou para o Mercado Livre.

