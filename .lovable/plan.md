

## Plano: Enriquecer payload do evento `order.paid`

### Objetivo
Adicionar 3 informações em cada item do payload do webhook `order.paid`:
1. **Link da imagem principal** do produto (`main_image_url` ou `image_url`)
2. **Preço de custo** do produto (`cost_price`)
3. **Variação** (quando o produto tiver variação selecionada)

### Como funciona hoje
O payload é montado em **4 locais diferentes** com a mesma estrutura de `items` (DRY problemático). Cada item hoje só tem:
```
{ product_id, name, sku, image_url, quantity, unit_price }
```

A imagem vem de `product_snapshot.image_url`, que **muitas vezes está null** (snapshot é minimalista). O `cost_price` está no snapshot mas nunca é exposto. A variação não está rastreada no order_item (só vem embutida no `productName` quando o cliente escolhe — ex: "Camiseta - GG").

### Solução

#### 1. Criar função utilitária compartilhada
Criar `supabase/functions/_shared/build-order-items-payload.ts` que:
- Recebe `order_items` + `supabase client`
- Busca em batch os produtos referenciados (`products.main_image_url`, `image_url`, `cost_price`, `variations`, `has_variations`)
- Para cada item, monta:
```json
{
  "product_id": "...",
  "name": "...",
  "sku": "...",
  "image_url": "<main_image_url || image_url || snapshot.image_url>",
  "cost_price": 12.50,
  "quantity": 2,
  "unit_price": 29.90,
  "variation": {
    "name": "GG - Azul",
    "sku": "...",
    "attributes": { "Tamanho": "GG", "Cor": "Azul" },
    "price": 29.90
  } | null
}
```

#### 2. Detectar variação selecionada
Como hoje a variação só aparece embutida em `product_snapshot.name` (ex: "Camiseta - GG"), a função fará o seguinte:
- Se `product.has_variations` e o nome do snapshot tiver sufixo após " - ", extrair a parte após o último " - " e fazer `match` no array `product.variations` por `name`/`sku`/`attributes`
- Se encontrar, anexa o objeto `variation` completo
- Se não tiver variação, retorna `variation: null`

#### 3. Refatorar os 4 locais para usar a função
| Arquivo | Ação |
|---|---|
| `supabase/functions/dispatch-webhook/index.ts` | usar a função |
| `supabase/functions/dispatch-order-webhook/index.ts` | usar a função |
| `supabase/functions/webhook-n8n-payment/index.ts` | usar a função |
| `supabase/functions/check-pending-payments/index.ts` | usar a função |

#### 4. Atualizar documentação do payload
- `src/data/apiEndpointsData.ts` → atualizar o `responseExample` do evento `order.paid` mostrando os novos campos

### Observação sobre rastreamento futuro de variações
A detecção por nome funciona para o estado atual, mas é frágil. Como melhoria futura (fora deste escopo), seria ideal salvar `variation_sku` ou `variation_id` em `product_snapshot` no momento do checkout (`create-pix-payment`). Posso incluir isso aqui se quiser — me avise.

### Resultado
Todo consumidor do webhook `order.paid` (n8n, sistemas externos) receberá imagem garantida, custo do item e variação escolhida quando aplicável, sem precisar consultar a API de produtos depois.

