
## ✅ Simplificar dados do campo `data` JSONB — CONCLUÍDO

### O que foi feito

1. **Edge Function `lojafy-integra`:**
   - Campos proibidos (`price`, `available_quantity`, `attributes`, `listing_type_id`, `buying_mode`, `currency_id`) são removidos automaticamente do payload antes de salvar no `data` JSONB
   - Validação do campo `listing_type` (aceita apenas `classic` ou `premium`, default `classic`)
   - Helper `getMLListingType()` que converte `classic` → `gold_special` e `premium` → `gold_pro`

2. **Documentação API (`apiEndpointsData.ts`):**
   - Exemplos atualizados sem campos removidos
   - Novo campo `listing_type` nos exemplos
   - Descrição menciona que price/stock/attributes vêm do produto Lojafy
