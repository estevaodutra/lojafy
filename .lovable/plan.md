

## Plano: Adicionar link do produto no payload do `order.paid`

### Objetivo
Incluir em cada item do payload do webhook `order.paid` o **link público do produto** (URL acessível para o cliente/sistema externo abrir a página do produto).

### Investigação
Preciso confirmar 2 coisas:
1. Qual a rota pública do produto na aplicação (provavelmente `/produto/:slug` ou `/produto/:id`)
2. Se o produto tem campo `slug` ou se devemos usar o `id`

Olhando rapidamente a estrutura, a app está publicada em `https://lojafy.app`. A URL final do produto seria algo como `https://lojafy.app/produto/<slug-ou-id>`.

### Solução

#### 1. Atualizar `supabase/functions/_shared/build-order-items-payload.ts`
- Adicionar `slug` ao SELECT da tabela `products` (se a coluna existir; senão usar `id`)
- Adicionar campo `product_url` ao retorno de cada item:
```
product_url: `https://lojafy.app/produto/${product.slug ?? product.id}`
```
- Tornar a base URL configurável via variável de ambiente `PUBLIC_SITE_URL` com fallback para `https://lojafy.app`

#### 2. Atualizar documentação
- `src/data/apiEndpointsData.ts` → adicionar `product_url` no `responseExample` do evento `order.paid`

### Estrutura final de cada item
```json
{
  "product_id": "...",
  "product_url": "https://lojafy.app/produto/camiseta-basica",
  "name": "...",
  "sku": "...",
  "image_url": "...",
  "cost_price": 12.50,
  "quantity": 2,
  "unit_price": 29.90,
  "variation": { ... } | null
}
```

### Arquivos alterados
| Arquivo | Alteração |
|---|---|
| `supabase/functions/_shared/build-order-items-payload.ts` | adicionar `slug` no SELECT e campo `product_url` no retorno |
| `src/data/apiEndpointsData.ts` | atualizar exemplo do payload |

### Observação
Antes de implementar, vou confirmar no código a rota pública correta do produto e se a tabela `products` tem coluna `slug`. Caso não tenha, usaremos o `id` como fallback na URL.

