

## Corrigir Formula do Preco Sugerido

### Problema

O "Preco Sugerido" usa uma formula simples de markup (`custo * 1.30 = R$ 12,99`), enquanto a tabela usa a formula correta que considera as taxas do ML (`custo / (1 - taxa - margem) = R$ 17,84`). Os dois valores deveriam ser consistentes.

### Causa

Na linha 39 do `ProductCalculatorModal.tsx`:
```
const suggestedPrice = costPrice * 1.30;
```
Isso e um markup simples de 30%, que nao considera as taxas do Mercado Livre. A tabela usa `calcularPrecoMinimo(30, 0.14)` que resulta em R$ 17,84.

### Correcao

**Arquivo:** `src/components/reseller/ProductCalculatorModal.tsx`

Substituir o calculo simples pelo calculo que considera a taxa do Classico (14%) como padrao:

```typescript
// ANTES:
const suggestedPrice = costPrice * 1.30;

// DEPOIS:
const suggestedPrice = calcularPrecoMinimo(30, TAXAS_ML.classico);
```

Isso fara o Preco Sugerido exibir R$ 17,84, consistente com a linha de 30% / Classico da tabela.

Obs: a funcao `calcularPrecoMinimo` ja existe no componente e e usada pela tabela, entao basta reutiliza-la. Porem ela depende de `costPrice`, que e declarado antes dela. Sera necessario mover a declaracao de `suggestedPrice` para depois da definicao de `calcularPrecoMinimo`.

