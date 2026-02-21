

## Corrigir Preco Sugerido no Card do Catalogo

### Problema

O card do catalogo usa `calculatePrice(product.price, 30)` que faz um markup simples (`custo * 1.30 = R$ 12,99`). A calculadora usa `calcularPrecoMinimo(30, 0.14)` que considera a taxa do ML (`custo / (1 - 0.14 - 0.30) = R$ 17,84`). Os dois precisam usar a mesma formula.

### Correcao

**Arquivo:** `src/hooks/useResellerCatalog.ts`

Atualizar a funcao `getSuggestedPrice` (linhas 261-267) para usar a formula que considera a taxa do Mercado Livre Classico (14%):

```typescript
// ANTES:
const getSuggestedPrice = (product: CatalogProduct): number => {
  if (product.price) {
    return calculatePrice(product.price, 30); // custo * 1.30
  }
  return 0;
};

// DEPOIS:
const TAXA_ML_CLASSICO = 0.14;

const getSuggestedPrice = (product: CatalogProduct): number => {
  if (product.price) {
    const divisor = 1 - TAXA_ML_CLASSICO - 30 / 100;
    if (divisor <= 0) return 0;
    return product.price / divisor; // Mesmo calculo da calculadora
  }
  return 0;
};
```

### Resultado

O "Preco Sugerido" no card e na calculadora exibirao o mesmo valor (R$ 17,84), ambos considerando a taxa de 14% do Classico e margem de 30%.

