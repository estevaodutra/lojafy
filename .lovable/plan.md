
## Simplificar dados do campo `data` JSONB na Edge Function e documentacao

### Resumo
Remover campos duplicados (`price`, `available_quantity`, `attributes`, `listing_type_id`, `buying_mode`, `currency_id`) do campo `data` JSONB da tabela `product_marketplace_data`. Esses valores serao obtidos do produto Lojafy na hora da publicacao. Adicionar validacao do novo campo `listing_type` (classic/premium) e helper de conversao para a API do ML.

### Alteracoes

**Nao e necessaria migracao SQL** - a tabela usa JSONB flexivel, entao basta ajustar o que e enviado/aceito pela Edge Function.

---

**1. Edge Function `supabase/functions/lojafy-integra/index.ts`**

No handler do `POST /products`:
- Adicionar lista de campos proibidos que serao removidos automaticamente do payload antes de salvar no `data` JSONB: `price`, `available_quantity`, `attributes`, `listing_type_id`, `buying_mode`, `currency_id`
- Validar `listing_type` se fornecido (aceitar apenas `classic` ou `premium`), defaulting para `classic`
- Adicionar funcao helper `getMLListingType()` que converte `classic` para `gold_special` e `premium` para `gold_pro` (exportada para uso futuro pelo n8n/publicacao)

Campos que continuam sendo aceitos no `data`: `category_id`, `category_name`, `domain_id`, `listing_type`, `condition`, `title`, `description`, `pictures`, `variations`, `shipping`, `sale_terms`

---

**2. Documentacao `src/data/apiEndpointsData.ts`**

Atualizar o endpoint POST `/lojafy-integra/products`:
- Remover do `requestBody` de exemplo: `listing_type_id`, `buying_mode`, `currency_id`, `price`, `available_quantity`, `attributes`
- Adicionar `listing_type: "classic"` no exemplo
- Atualizar o `responseExample` para refletir a nova estrutura sem os campos removidos
- Atualizar descricao do endpoint mencionando que `price`, `stock_quantity` e `attributes` vem do produto Lojafy

Atualizar tambem os exemplos do GET que mostram o campo `data` (remover `price` e `attributes` dos exemplos de resposta).
