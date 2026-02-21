

## Adicionar Indicador "Pronto ML" e Filtro "Top 10" no Catalogo do Revendedor

### Resumo

Duas funcionalidades novas na pagina `/reseller/catalogo`:
1. Badge amarelo "ML" nos cards de produtos que possuem dados validados na tabela `product_marketplace_data`
2. Filtro especial "Top 10" usando a tabela `product_ranking` ja existente

Nenhuma migracao de banco necessaria -- ambas as tabelas (`product_marketplace_data` e `product_ranking`) ja existem.

---

### 1. Buscar dados de ML Ready no hook `useResellerCatalog`

**Arquivo: `src/hooks/useResellerCatalog.ts`**

- Apos buscar os produtos e os dados da loja do usuario, fazer uma query adicional em `product_marketplace_data` para obter os `product_id` dos produtos com `marketplace = 'mercadolivre'` e (`is_validated = true` ou `listing_status` in `('ready', 'active', 'pending')`).
- Enriquecer cada produto com `ml_ready: boolean`.
- Adicionar ao `CatalogProduct` interface o campo `ml_ready?: boolean`.

### 2. Filtro "Top 10" usando `product_ranking`

**Arquivo: `src/hooks/useResellerCatalog.ts`**

- Adicionar `topProducts?: boolean` ao `CatalogFilters`.
- Quando `topProducts = true`, buscar os IDs dos 10 primeiros produtos da tabela `product_ranking` (ordenados por `position ASC`) e filtrar a query principal com `.in('id', topProductIds)`.

### 3. Badge "ML" no card do produto

**Arquivo: `src/pages/reseller/Catalog.tsx`**

- No bloco de badges da imagem (ao lado de "Destaque", "Alto Giro", "Na Loja"), adicionar um badge amarelo "ML" quando `product.ml_ready === true`.
- Usar icone `CheckCircle2` ou emoji com texto "ML".

### 4. Chips de filtro especial na UI

**Arquivo: `src/pages/reseller/Catalog.tsx`**

- Adicionar uma linha de chips/botoes acima dos filtros de dropdown:
  - **Todos** (padrao)
  - **Top 10** (icone Trophy) -- ativa `topProducts: true`
  - **Prontos ML** (badge amarelo) -- ativa `mlReadyOnly: true`
- Adicionar estado `specialFilter` para controlar qual chip esta ativo.
- Ao clicar num chip, chamar `applyFilters()` com o filtro correspondente.

### 5. Filtro "Prontos ML"

**Arquivo: `src/hooks/useResellerCatalog.ts`**

- Adicionar `mlReadyOnly?: boolean` ao `CatalogFilters`.
- Quando ativo, filtrar apenas produtos cujos IDs estejam na lista de ML ready (obtida na query adicional do passo 1).

---

### Secao Tecnica

**Interface `CatalogProduct`** -- adicionar:
```text
ml_ready?: boolean;
```

**Interface `CatalogFilters`** -- adicionar:
```text
topProducts?: boolean;
mlReadyOnly?: boolean;
```

**Query ML Ready** (dentro de `fetchCatalogProducts`):
```text
supabase
  .from('product_marketplace_data')
  .select('product_id')
  .eq('marketplace', 'mercadolivre')
  .or('is_validated.eq.true,listing_status.in.(ready,active,pending)')
```

**Query Top 10** (quando filtro ativo):
```text
supabase
  .from('product_ranking')
  .select('product_id')
  .order('position', { ascending: true })
  .limit(10)
```

Depois filtrar a query principal com `.in('id', topProductIds)`.

**Badge no card** (posicao: absolute top-2, entre Destaque e Alto Giro):
```text
{product.ml_ready && (
  <Badge className="absolute top-2 right-2 bg-amber-500 hover:bg-amber-600 text-white text-xs">
    ML
  </Badge>
)}
```
Ajustar posicionamento para nao sobrepor badges existentes (Alto Giro vai para `top-2 right-14` ou usar flex no topo).

**Chips de filtro** (antes do card de filtros):
```text
<div className="flex gap-2">
  <Badge variant={specialFilter === 'all' ? 'default' : 'outline'} onClick={...}>Todos</Badge>
  <Badge variant={specialFilter === 'top10' ? 'default' : 'outline'} onClick={...}>Top 10</Badge>
  <Badge variant={specialFilter === 'ml_ready' ? 'default' : 'outline'} onClick={...}>Prontos ML</Badge>
</div>
```

### Arquivos alterados

1. `src/hooks/useResellerCatalog.ts` -- adicionar campos, queries e filtros
2. `src/pages/reseller/Catalog.tsx` -- adicionar badge ML e chips de filtro

Nenhuma migracao de banco necessaria.
