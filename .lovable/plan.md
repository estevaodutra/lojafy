

## Atualizar Calculadora de Margem com Taxas do Mercado Livre

### O que sera feito

Reescrever o componente `ProductCalculatorModal` para incluir as taxas reais do Mercado Livre nos calculos de margem, lucro e preco minimo. Atualmente a calculadora ignora taxas, mostrando valores incorretos.

### Alteracoes

**Arquivo: `src/components/reseller/ProductCalculatorModal.tsx`**

#### 1. Novo estado: tipo de anuncio
- Adicionar estado `tipoAnuncio` com opcoes "classico" (14%) e "premium" (19%)
- Importar componentes `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`

#### 2. Seletor de tipo de anuncio
- Adicionar um `Select` entre as informacoes do produto e os campos de preco
- Opcoes: Classico (14%) e Premium (19%)

#### 3. Formulas corrigidas
Substituir as formulas atuais pelas que consideram taxa ML:

| Calculo | Formula Atual (errada) | Formula Nova (correta) |
|---------|----------------------|----------------------|
| Lucro | `preco - custo` | `preco - custo - (preco * taxaML)` |
| Margem | `(preco - custo) / custo * 100` | `(lucro / preco) * 100` |
| Preco pela margem | `custo * (1 + margem/100)` | `custo / (1 - taxaML - margem/100)` |

#### 4. Resultado da analise atualizado
Mostrar detalhamento completo:
- Taxa ML (valor em R$)
- Custo
- Lucro real (ja descontando taxa)
- Margem real
- Status: Prejuizo / Margem baixa / Margem OK / Margem otima
- Preco minimo para a margem desejada

#### 5. Tabela de referencia rapida
Adicionar abaixo do resultado uma mini tabela mostrando precos minimos para margens de 10%, 15%, 20%, 25%, 30%, 35%, 40% - calculados com a taxa selecionada.

### Secao Tecnica

**Constantes de taxa:**
```text
CLASSICO = 0.14 (14%)
PREMIUM  = 0.19 (19%)
```

**Funcoes de calculo:**
```text
valorTaxa  = precoVenda * taxaML
lucroReal  = precoVenda - custoProduto - valorTaxa
margemReal = (lucroReal / precoVenda) * 100
precoMinimo = custoProduto / (1 - taxaML - margemDesejada/100)
```

**Status da margem:**
```text
lucro < 0       -> Prejuizo (vermelho)
margem < 10%    -> Margem baixa (vermelho)
margem < 20%    -> Margem OK (amarelo)
margem >= 20%   -> Margem otima (verde)
```

**Imports adicionais:**
- `Select, SelectContent, SelectItem, SelectTrigger, SelectValue` de `@/components/ui/select`
- `TrendingDown, AlertTriangle` de `lucide-react`

**Arquivo unico alterado:** `src/components/reseller/ProductCalculatorModal.tsx`

