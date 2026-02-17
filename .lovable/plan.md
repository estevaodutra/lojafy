

# Unificar Endpoints de Produtos em uma Categoria

## Problema
Existem duas categorias separadas no menu lateral que documentam endpoints de produtos:
- **Catalogo** -- endpoints antigos (`api-produtos-*`) misturados com categorias, subcategorias e dominios
- **Produtos (REST)** -- endpoints novos (`/products`) com a mesma finalidade

Isso gera confusao na documentacao.

## Solucao

Reorganizar a categoria **Catalogo** em subcategorias e absorver os endpoints "Produtos (REST)", eliminando a duplicidade.

### Nova estrutura:

```text
Catalogo
  +-- Produtos (API Key)       [6 endpoints: api-produtos-*]
  +-- Produtos (REST)          [12 endpoints: /products]
  +-- Categorias               [2 endpoints]
  +-- Subcategorias            [2 endpoints]
  +-- Dominios e Atributos     [2 endpoints]
```

## Alteracoes

### 1. `src/data/apiEndpointsData.ts`
- Separar o array `catalogEndpoints` (atualmente 14 endpoints em lista plana) em 4 arrays menores:
  - `catalogProductsApiKey` (6): Cadastrar, Listar, Aguardando Aprovacao, Atributos, Add Variacao, Del Variacao
  - `catalogCategories` (2): Listar Categorias, Cadastrar Categoria
  - `catalogSubcategories` (2): Listar Subcategorias, Cadastrar Subcategoria
  - `catalogDomains` (2): Listar Dominios, Listar Definicoes de Atributos
- Manter o array `productsRestEndpoints` existente (12 endpoints) como esta
- Atualizar a entrada `catalog` no `apiEndpointsData` para usar `subcategories` em vez de `endpoints`:
  - Subcategoria "Produtos (API Key)" com `catalogProductsApiKey`
  - Subcategoria "Produtos (REST)" com `productsRestEndpoints`
  - Subcategoria "Categorias" com `catalogCategories`
  - Subcategoria "Subcategorias" com `catalogSubcategories`
  - Subcategoria "Dominios e Atributos" com `catalogDomains`
- Remover a entrada `products-rest` do array `apiEndpointsData` (linha 1637-1641)

### 2. `src/components/admin/ApiDocsSidebar.tsx`
- Nenhuma alteracao necessaria -- o sidebar ja suporta `subcategories` (usado por Academy e Integra)

### 3. `src/components/admin/ApiDocsContent.tsx`
- Adicionar "catalog" ao `getCategoryTitle()` se necessario (ja existe)
- Nenhuma outra alteracao necessaria -- o componente ja renderiza subcategorias via `flatMap`

### Resultado
- Uma unica categoria "Catalogo" com 5 subcategorias claras
- Total de 24 endpoints organizados
- Sem duplicidade na documentacao
