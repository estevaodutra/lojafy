

# Implementar Modulo Lojafy Integra - Tabela e Edge Function

## Resumo

Criar a infraestrutura backend do modulo Lojafy Integra: uma nova tabela `product_marketplace_data` para armazenar dados de produtos customizados por marketplace, e uma Edge Function `lojafy-integra` com API REST completa para CRUD desses dados.

## Alteracoes

### 1. Migration SQL - Criar tabela `product_marketplace_data`

Criar novo arquivo de migracao em `supabase/migrations/` com:

- Tabela `product_marketplace_data` com todos os campos especificados (product_id, marketplace, title, description, price, attributes JSONB, variations JSONB, images JSONB, status, listing_id, etc.)
- Constraint UNIQUE em (product_id, marketplace)
- CHECK constraints para marketplace e status
- 6 indices para performance (product_id, marketplace, status, user_id, listing_id, marketplace+status)
- Trigger para auto-update de `updated_at`
- RLS habilitado com 5 policies (SELECT, INSERT, UPDATE, DELETE para o proprio usuario + acesso total para service_role)

### 2. Edge Function `lojafy-integra/index.ts`

Criar nova Edge Function com roteamento baseado em URL path e metodo HTTP:

| Metodo | Path | Descricao |
|--------|------|-----------|
| POST | /products | Criar produto para marketplace (com validacoes de campos obrigatorios e verificacao se produto original existe) |
| POST | /products/bulk | Criar multiplos produtos de uma vez |
| GET | /products | Listar produtos com filtros (marketplace, status, user_id) e paginacao |
| GET | /products/:id | Buscar produto especifico por ID (com join na tabela products) |
| GET | /products/by-product/:productId | Listar em quais marketplaces um produto esta |
| PUT | /products/:id | Atualizar dados do produto no marketplace |
| DELETE | /products/:id | Remover produto do marketplace |

A funcao usa `SUPABASE_SERVICE_ROLE_KEY` para acesso completo e segue o padrao das outras edge functions do projeto (CORS headers, tratamento de erros, logging).

### 3. Atualizar `supabase/config.toml`

Adicionar entrada para a nova funcao:
```
[functions.lojafy-integra]
verify_jwt = false
```

## Detalhes Tecnicos

### Estrutura da tabela

- `product_id` (UUID, FK para products com CASCADE) - vinculo com produto Lojafy
- `marketplace` (TEXT com CHECK) - identificador do marketplace (mercadolivre, shopee, amazon, magalu, americanas, via_varejo)
- `attributes` (JSONB) - atributos especificos do marketplace (ex: BRAND, MODEL, VOLTAGE para ML)
- `variations` (JSONB) - variacoes com SKU, atributos, estoque e preco individual
- `status` (TEXT com CHECK) - ciclo de vida: draft -> pending -> pending_review -> active -> paused/inactive/error/deleted
- `listing_id`, `listing_url` - dados retornados pelo marketplace apos publicacao
- `marketplace_metadata` (JSONB) - campo coringa para dados extras

### Validacoes na Edge Function

- Campos obrigatorios: product_id, marketplace, title, price (> 0)
- Verificacao de existencia do produto original na tabela `products`
- Tratamento de erro de duplicacao (codigo 23505) com mensagem amigavel
- Protecao contra atualizacao de campos imutaveis (id, product_id, created_at)

### Arquivos criados/modificados

1. **CRIAR**: `supabase/migrations/[timestamp]_create_product_marketplace_data.sql`
2. **CRIAR**: `supabase/functions/lojafy-integra/index.ts`
3. **MODIFICAR**: `supabase/config.toml` (adicionar funcao lojafy-integra)

