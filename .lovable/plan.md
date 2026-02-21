

## Corrigir Preco de Custo na Calculadora de Margem

### Problema

O `ProductCalculatorModal` usa `product.cost_price` (custo interno do negocio) como base de calculo. Para o revendedor, o custo real e `product.price` (preco definido pelo super admin). Alem disso, o "Preco Sugerido" exibe `product.price` ao inves do preco com margem de 30%.

### Alteracoes

**Arquivo:** `src/components/reseller/ProductCalculatorModal.tsx`

#### 1. Corrigir a variavel costPrice (linha 39)

```text
// ANTES:
const costPrice = product.cost_price || 0;

// DEPOIS:
const costPrice = product.price; // Preco definido pelo admin = custo do revendedor
```

#### 2. Corrigir o Preco Sugerido exibido (linha 105)

Calcular o preco sugerido com margem de 30% sobre o custo do revendedor:

```text
// ANTES:
<p className="font-medium text-lg">{fmt(product.price)}</p>

// DEPOIS:
const suggestedPrice = costPrice * 1.30; // 30% de margem
// E exibir: {fmt(suggestedPrice)}
```

#### 3. Atualizar o label "Preco de Custo" (linha 100)

Manter como "Preco de Custo" pois agora reflete corretamente o custo do revendedor (`product.price`).

### Resultado

- "Preco de Custo" mostrara o preco que o revendedor paga (definido pelo admin)
- "Preco Sugerido" mostrara o preco com 30% de margem
- Todos os calculos da tabela de margem usarao o custo correto

