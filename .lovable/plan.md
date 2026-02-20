
## Atualizar Calculadora de Margem

### Resumo
Reescrever o `ProductCalculatorModal` para remover o dropdown de tipo de anuncio e a secao "Resultado", substituindo pela tabela comparativa Classico vs Premium lado a lado com celulas clicaveis.

### Alteracoes no arquivo `src/components/reseller/ProductCalculatorModal.tsx`

**Remover:**
- Estado `tipoAnuncio` e `customPrice`
- Import do `Select` (nao mais necessario)
- Secao "Tipo de Anuncio (Mercado Livre)" (linhas 126-138)
- Grid com "Preco de Venda" + "Resultado" (linhas 140-219)
- Imports nao utilizados (`TrendingUp`, `TrendingDown`, `AlertTriangle`)

**Adicionar:**
- Estado `precoSelecionado` para rastrear a celula clicada na tabela (`{ preco, tipo, margem }`)
- Funcao `calcularPrecoMinimo` que aceita taxa como parametro (em vez de usar `taxaML` do estado)

**Manter:**
- Card do produto (imagem, nome, preco de custo, preco sugerido)
- Campo "Margem Desejada" com botao "Calcular" -- agora mostra preco minimo para **ambos** os tipos
- Botoes "Cancelar" e "Adicionar a Loja"

**Nova Tabela de Referencia:**
- Header com 2 niveis: Margem | Classico (14%) [Preco, Lucro] | Premium (19%) [Preco, Lucro]
- Celulas clicaveis -- ao clicar, destaca a linha e preenche o `precoSelecionado`
- Indicador visual abaixo da tabela mostrando o preco selecionado
- Botao "Adicionar a Loja" usa o preco da celula selecionada

**Ajuste na interface `onAddToStore`:**
- O botao "Adicionar a Loja" continuara chamando `onAddToStore(product.id, precoSelecionado.preco)` com o preco da celula clicada
- O modal sera um pouco mais largo (`sm:max-w-2xl`) para acomodar a tabela expandida

### Secao Tecnica

Estrutura simplificada do componente:

```text
Dialog
  DialogHeader (titulo + descricao)
  Card do Produto (imagem, nome, custo, sugerido)
  Margem Desejada [input %] [Calcular]
    -> "Classico: R$ X | Premium: R$ Y"
  Tabela de Referencia (5 colunas)
    Margem | Preco Classico | Lucro Classico | Preco Premium | Lucro Premium
    (celulas clicaveis com highlight)
  Indicador de selecao (se celula clicada)
  [Cancelar] [Adicionar a Loja]
```

- `calcularPrecoMinimo(margem, taxa)` recebe taxa como parametro
- `calcularLucro(preco, taxa)` = preco - custo - (preco * taxa)
- Estado `precoSelecionado: { preco: number, tipo: 'classico' | 'premium', margem: number } | null`
- Celula selecionada recebe `bg-primary/10 ring-2 ring-primary`
