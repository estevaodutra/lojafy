

# Corrigir Roteamento da Edge Function `products`

## Problema
A URL chamada e:
```
/functions/v1/products/c53a75c2-41c3-42ec-98e7-ba0e78ba83e1
```

O codigo atual faz `url.pathname.split('/').filter(Boolean)` que resulta em:
```
['functions', 'v1', 'products', 'c53a75c2-...']
```

Porem o roteamento usa indices fixos:
- `pathParts[1]` como ID do produto (que na verdade e `'v1'`)
- `pathParts[2]` como sub-recurso (que na verdade e `'products'`)

Nenhuma rota bate e o resultado e "Endpoint nao encontrado".

## Solucao

Alterar o parsing do path para encontrar o indice de `'products'` no array e usar os segmentos relativos a ele:

```text
pathParts = ['functions', 'v1', 'products', 'c53a75c2-...', 'attributes']
                                     ^idx       ^idx+1           ^idx+2

segment1    = pathParts[idx + 1]  // product ID ou "pending"
subResource = pathParts[idx + 2]  // "attributes", "variations", etc.
subResourceId = pathParts[idx + 3] // SKU para variacoes
```

## Alteracao

### `supabase/functions/products/index.ts` (linhas 99-104)

De:
```typescript
const pathParts = url.pathname.split('/').filter(Boolean);
const segment1 = pathParts[1];
const productId = segment1 && segment1 !== 'pending' ? segment1 : null;
const subResource = pathParts[2];
const subResourceId = pathParts[3];
```

Para:
```typescript
const pathParts = url.pathname.split('/').filter(Boolean);
const productsIndex = pathParts.indexOf('products');
const segment1 = productsIndex >= 0 ? pathParts[productsIndex + 1] : undefined;
const productId = segment1 && segment1 !== 'pending' ? segment1 : null;
const subResource = productsIndex >= 0 ? pathParts[productsIndex + 2] : undefined;
const subResourceId = productsIndex >= 0 ? pathParts[productsIndex + 3] : undefined;
```

### Resultado
- `GET /functions/v1/products` -> lista produtos
- `GET /functions/v1/products/{id}` -> busca produto por ID
- `PUT /functions/v1/products/{id}/attributes` -> atualiza atributos
- Todas as rotas passam a funcionar corretamente

### Arquivo modificado
- `supabase/functions/products/index.ts`

