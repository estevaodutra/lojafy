

# Sincronizar Preço de Custo das Variações com o Produto

## Problema
Cada variação tem seu próprio campo `costPrice` independente. Quando a precificação automática está ativa, o preço de custo das variações deveria herdar automaticamente o "Preço de Custo" definido no produto principal, garantindo consistência.

## Solução

### 1. Passar `cost_price` do produto para o VariantsManager
- Em `ProductForm.tsx`, passar o `watchedCostPrice` e `watchedUseAutoPricing` como novas props para `<VariantsManager>`

### 2. Atualizar VariantsManager.tsx
- Adicionar props `productCostPrice` e `useAutoPricing` na interface `VariantsManagerProps`
- Quando `useAutoPricing` estiver ativo:
  - Ocultar o campo de custo individual de cada variação (já que todas usam o custo do produto)
  - Ao adicionar uma nova variação, usar `productCostPrice` como `costPrice` automaticamente
  - Ao atualizar variações existentes, sincronizar o `costPrice` quando o custo do produto mudar
  - Calcular o `priceModifier` (preço de venda) baseado no custo do produto
- Quando `useAutoPricing` estiver desativado, manter o comportamento atual (custo individual por variação)

### 3. useEffect para sincronização
- Adicionar um `useEffect` no VariantsManager que, quando `productCostPrice` mudar e `useAutoPricing` estiver ativo, recalcule o `costPrice` e `priceModifier` de todas as variações existentes

### Arquivos
| Arquivo | Alteração |
|---|---|
| `src/components/admin/VariantsManager.tsx` | Adicionar props, lógica de sincronização, ocultar campo custo quando auto |
| `src/components/admin/ProductForm.tsx` | Passar `productCostPrice` e `useAutoPricing` para VariantsManager |

