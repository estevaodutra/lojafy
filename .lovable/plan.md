
## Corrigir Precificacao no Card do Catalogo do Revendedor

### Problema

O card do catalogo exibe `product.cost_price` (custo real do produto para o negocio) como "Custo" do revendedor. O correto e usar `product.price` (preco de venda definido pelo super admin), que e o valor que o revendedor efetivamente paga pelo produto.

### Alteracao

**Arquivo:** `src/pages/reseller/Catalog.tsx`

#### 1. Variavel de custo do revendedor (linha 434-437)

Substituir o uso de `product.cost_price` por `product.price` no calculo de margem e lucro:

```text
// ANTES:
const margin = product.cost_price ? calculateMargin(product.cost_price, suggestedPrice) : 0;
const lucro = displayPrice - (product.cost_price || 0) - taxaML;

// DEPOIS:
const resellerCost = product.price; // Preco definido pelo super admin = custo do revendedor
const margin = resellerCost ? calculateMargin(resellerCost, suggestedPrice) : 0;
const lucro = displayPrice - resellerCost - taxaML;
```

#### 2. Exibicao do custo no grid de precos (linha 509-512)

Trocar a referencia de `product.cost_price` para `resellerCost`:

```text
// ANTES:
{product.cost_price ? `R$ ${product.cost_price.toFixed(2)}` : 'N/A'}

// DEPOIS:
R$ {resellerCost.toFixed(2)}
```

#### 3. Tooltip do lucro (linha 535)

Atualizar a linha de custo no tooltip:

```text
// ANTES:
<p>- Custo: R$ {(product.cost_price || 0).toFixed(2)}</p>

// DEPOIS:
<p>- Custo: R$ {resellerCost.toFixed(2)}</p>
```

### Resumo

Tres pontos de alteracao no mesmo arquivo, todos substituindo `product.cost_price` por `product.price` (via variavel `resellerCost`) para refletir corretamente o custo do revendedor.
