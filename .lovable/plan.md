
# Adicionar Endpoints do Lojafy Integra na Documentacao da API

## Resumo

Adicionar os 7 endpoints da Edge Function `lojafy-integra` (CRUD de produtos para marketplaces) na documentacao de API existente, dentro da categoria "Lojafy Integra" que ja existe no sidebar.

## Alteracoes

### 1. Adicionar dados dos endpoints (`src/data/apiEndpointsData.ts`)

Criar um novo array `integraProductsEndpoints` com os 7 endpoints documentados:

| Metodo | Path | Titulo |
|--------|------|--------|
| POST | `/functions/v1/lojafy-integra/products` | Criar Produto para Marketplace |
| POST | `/functions/v1/lojafy-integra/products/bulk` | Criar Produtos em Lote |
| GET | `/functions/v1/lojafy-integra/products` | Listar Produtos por Marketplace |
| GET | `/functions/v1/lojafy-integra/products/:id` | Buscar Produto por ID |
| GET | `/functions/v1/lojafy-integra/products/by-product/:productId` | Listar Marketplaces de um Produto |
| PUT | `/functions/v1/lojafy-integra/products/:id` | Atualizar Produto no Marketplace |
| DELETE | `/functions/v1/lojafy-integra/products/:id` | Remover Produto do Marketplace |

Cada endpoint tera:
- Headers (X-API-Key)
- Request body ou query params conforme o caso
- Response example realista
- Error examples (400, 401, 404, 409 conforme aplicavel)

Adicionar a nova subcategoria `integra-products` com titulo "Produtos Marketplace" dentro da categoria `integra` existente, junto com a subcategoria `integra-ml` (Mercado Livre) que ja existe.

### 2. Atualizar titulo da categoria no conteudo (`src/components/admin/ApiDocsContent.tsx`)

Na funcao `getCategoryTitle`, adicionar o case para `integra`:

```typescript
case 'integra': return { 
  title: 'Endpoints Lojafy Integra', 
  desc: 'API para gestao de produtos em marketplaces (Mercado Livre, Shopee, Amazon, etc.)' 
};
```

Tambem adicionar o card "Integra" na secao de categorias do IntroSection.

### Arquivos modificados

1. **`src/data/apiEndpointsData.ts`** - Adicionar array `integraProductsEndpoints` (~130 linhas) e incluir como subcategoria na categoria `integra`
2. **`src/components/admin/ApiDocsContent.tsx`** - Adicionar case `integra` no `getCategoryTitle` e card na intro

## Detalhes Tecnicos

### Exemplo de endpoint documentado (Criar Produto):

```typescript
{
  title: 'Criar Produto para Marketplace',
  method: 'POST',
  url: '/functions/v1/lojafy-integra/products',
  description: 'Cria um produto customizado para um marketplace especifico...',
  headers: [
    { name: 'X-API-Key', description: 'Chave de API', example: 'sk_...', required: true }
  ],
  requestBody: {
    product_id: 'uuid-do-produto-lojafy',
    marketplace: 'mercadolivre',
    title: 'Mini Maquina de Waffles Eletrica',
    price: 29.90,
    attributes: { BRAND: 'Generica', VOLTAGE: '110V' },
    variations: [],
    stock_quantity: 50,
    images: ['https://...'],
    status: 'draft',
    listing_type: 'gold_special'
  },
  responseExample: { success: true, data: { id: 'uuid', ... } },
  errorExamples: [
    { code: 400, title: 'Campos obrigatorios', ... },
    { code: 404, title: 'Produto nao encontrado', ... },
    { code: 409, title: 'Duplicado', ... }
  ]
}
```

### Estrutura final da categoria Integra no sidebar:

```
Lojafy Integra (8 endpoints)
  |- Mercado Livre (1 endpoint existente)
  |    |- POST Salvar Token OAuth
  |- Produtos Marketplace (7 novos endpoints)
       |- POST Criar Produto para Marketplace
       |- POST Criar Produtos em Lote
       |- GET Listar Produtos por Marketplace
       |- GET Buscar Produto por ID
       |- GET Listar Marketplaces de um Produto
       |- PUT Atualizar Produto no Marketplace
       |- DELETE Remover Produto do Marketplace
```
