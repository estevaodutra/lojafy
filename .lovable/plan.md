

# Novo Endpoint: Buscar Produto Nao Publicado em Marketplace

## Resumo

Criar um endpoint `GET /products/unpublished` na Edge Function `lojafy-integra` que retorna **1 produto** do catalogo Lojafy (`products`) que ainda **nao esta cadastrado** na tabela `product_marketplace_data` para um marketplace especifico. Ideal para reprocessamento em lote via n8n ou automacoes externas.

## Logica do Endpoint

O endpoint faz uma query na tabela `products` buscando produtos ativos que **nao possuem** registro na `product_marketplace_data` para o marketplace informado. Retorna apenas 1 resultado por vez (para processar um a um).

```text
products (ativo)  --->  Tem registro em product_marketplace_data para o marketplace X?
                           |
                     NAO --+-- SIM
                      |          |
                  Retorna    Ignora (ja publicado)
```

## Alteracoes

### 1. Edge Function `supabase/functions/lojafy-integra/index.ts`

Adicionar novo handler **antes** do handler generico `GET /products/:id` (para evitar conflito de roteamento):

**Rota:** `GET /products/unpublished?marketplace=mercadolivre`

**Parametros de query:**
- `marketplace` (obrigatorio) - Filtrar por marketplace (mercadolivre, shopee, amazon, etc.)
- `user_id` (opcional) - Filtrar por usuario

**Logica:**
1. Validar que `marketplace` foi informado (retornar 400 se nao)
2. Buscar todos os `product_id` da `product_marketplace_data` filtrados pelo marketplace
3. Buscar 1 produto da tabela `products` que esteja ativo (`active = true`) e cujo `id` **nao esteja** na lista acima
4. Retornar o produto encontrado ou `null` se todos ja estiverem publicados

**Codigo do handler:**
```typescript
// GET /products/unpublished?marketplace=mercadolivre
if (method === 'GET' && endpoint === 'products' && subEndpoint === 'unpublished') {
  const marketplace = url.searchParams.get('marketplace');
  if (!marketplace) {
    return jsonResponse({ success: false, error: 'marketplace é obrigatório' }, 400);
  }

  const filterUserId = url.searchParams.get('user_id');

  // Buscar IDs de produtos ja cadastrados neste marketplace
  let existingQuery = supabase
    .from('product_marketplace_data')
    .select('product_id')
    .eq('marketplace', marketplace);
  if (filterUserId) existingQuery = existingQuery.eq('user_id', filterUserId);
  const { data: existing } = await existingQuery;
  const existingIds = (existing || []).map(e => e.product_id);

  // Buscar 1 produto ativo que NAO esta na lista
  let productQuery = supabase
    .from('products')
    .select('id, name, description, price, sku, gtin_ean13, main_image_url, brand, stock_quantity, category_id')
    .eq('active', true)
    .order('created_at', { ascending: true })
    .limit(1);

  if (existingIds.length > 0) {
    productQuery = productQuery.not('id', 'in', `(${existingIds.join(',')})`);
  }

  const { data: product, error } = await productQuery.maybeSingle();
  if (error) throw error;

  return jsonResponse({
    success: true,
    data: product,
    marketplace,
    remaining: product ? 'Existem mais produtos pendentes' : 'Todos os produtos ja estao cadastrados'
  });
}
```

### 2. Documentacao - `src/data/apiEndpointsData.ts`

Adicionar o 8o endpoint no array `integraProductsEndpoints`:

```typescript
{
  title: 'Buscar Produto Não Publicado',
  method: 'GET',
  url: '/functions/v1/lojafy-integra/products/unpublished',
  description: 'Retorna 1 produto do catálogo Lojafy que ainda não foi cadastrado para o marketplace informado.',
  headers: [
    { name: 'X-API-Key', description: 'Chave de API', example: 'sk_...', required: true }
  ],
  queryParams: [
    { name: 'marketplace', description: 'Marketplace alvo (obrigatório)', example: 'mercadolivre' },
    { name: 'user_id', description: 'Filtrar por usuário (opcional)', example: 'uuid' }
  ],
  responseExample: {
    success: true,
    data: {
      id: 'uuid-produto',
      name: 'Mini Máquina de Waffles',
      price: 24.90,
      sku: 'PROD-001',
      gtin_ean13: '7891234567890',
      main_image_url: 'https://...',
      brand: 'Genérica',
      stock_quantity: 50
    },
    marketplace: 'mercadolivre',
    remaining: 'Existem mais produtos pendentes'
  },
  errorExamples: [
    { code: 400, title: 'Marketplace obrigatório', ... },
    { code: 200, title: 'Todos publicados', data: null, remaining: 'Todos os produtos já estão cadastrados' }
  ]
}
```

## Arquivos Modificados

1. **`supabase/functions/lojafy-integra/index.ts`** - Adicionar handler `GET /products/unpublished` (antes do handler `GET /products/:id`)
2. **`src/data/apiEndpointsData.ts`** - Adicionar endpoint na documentacao (8o item do `integraProductsEndpoints`)

## Uso Pratico

```bash
# Buscar proximo produto nao publicado no Mercado Livre
curl "https://[PROJECT].supabase.co/functions/v1/lojafy-integra/products/unpublished?marketplace=mercadolivre" \
  -H "X-API-Key: sk_..."

# Retorno quando ha produto pendente:
{ "success": true, "data": { "id": "abc-123", "name": "...", ... }, "marketplace": "mercadolivre" }

# Retorno quando todos ja foram publicados:
{ "success": true, "data": null, "marketplace": "mercadolivre", "remaining": "Todos os produtos já estão cadastrados" }
```

Isso permite que o n8n chame esse endpoint em loop ate receber `data: null`, processando todos os produtos pendentes um a um.

