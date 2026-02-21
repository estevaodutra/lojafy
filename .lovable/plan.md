
## Atualizar Layout do Card de Produto no Catalogo do Revendedor

### Resumo

Redesenhar o card de produto inline no arquivo `src/pages/reseller/Catalog.tsx` para incluir coluna de lucro, grid de imagens 2x2, SKU acima do nome, tooltip com detalhamento do calculo e mensagem explicativa sobre o preco sugerido.

---

### Alteracoes no arquivo `src/pages/reseller/Catalog.tsx`

#### 1. Imports adicionais

Adicionar `Info` e imports de Tooltip (`Tooltip`, `TooltipTrigger`, `TooltipContent`) que ja estao importados (`TooltipProvider` ja existe, e os componentes de Tooltip ja estao disponiveis).

#### 2. Constante de taxa ML

Adicionar no topo do componente:
```text
const TAXA_ML = 0.14; // 14% Classico
```

#### 3. Grid de imagens 2x2

Substituir a imagem unica por um grid que mostra ate 4 imagens do produto (usando `product.images`). Se houver apenas 1 imagem (ou nenhuma no array), manter a imagem principal ocupando todo o espaco. Se houver 2+, montar grid 2x2.

#### 4. SKU acima do nome

Mover a linha de SKU/brand para antes do nome do produto, com estilo menor (text-xs text-muted-foreground).

#### 5. Grid de precos com 3 colunas (Custo | Preco Sug. | Lucro)

Substituir o grid 2 colunas por 3 colunas. A terceira coluna "Lucro" mostra o valor calculado:
- Lucro = Preco Sugerido - Custo - (Preco Sugerido * 0.14)
- Cor verde se lucro >= 0, vermelho se negativo
- Icone (i) com tooltip detalhando o calculo

#### 6. Tooltip do lucro

Ao passar o mouse no icone Info ao lado de "Lucro", exibir:
- Taxa ML utilizada (14% Classico)
- Decomposicao: Preco - Custo - Taxa = Lucro

#### 7. Mensagem explicativa

Abaixo do grid de precos, adicionar texto pequeno:
"O preco sugerido cobre todos os custos e taxas do ML"

#### 8. Cores condicionais na badge de margem

Atualizar `getMarginColor` para tambem aplicar borda colorida:
- >= 20%: verde
- 10-19%: amarelo
- < 10%: vermelho

---

### Secao Tecnica

**Arquivo alterado:** `src/pages/reseller/Catalog.tsx` (linhas 429-543 - bloco do card do produto)

**Calculo do lucro** (dentro do map de produtos):
```text
const displayPrice = product.isInMyStore && product.myStorePrice ? product.myStorePrice : suggestedPrice;
const taxaML = displayPrice * TAXA_ML;
const lucro = displayPrice - (product.cost_price || 0) - taxaML;
```

**Grid de imagens** - usar `product.images` (array ja disponivel no tipo `CatalogProduct`):
```text
const productImages = product.images?.length > 0 
  ? product.images.slice(0, 4) 
  : [product.main_image_url || product.image_url || '/placeholder.svg'];
```

Se 1 imagem: imagem unica full-width. Se 2-4 imagens: grid 2x2 com aspect-square em cada celula.

**Tooltip** - usar componentes `Tooltip`, `TooltipTrigger`, `TooltipContent` ja importados via `TooltipProvider` no wrapper.

**Nenhuma alteracao de banco necessaria.**
