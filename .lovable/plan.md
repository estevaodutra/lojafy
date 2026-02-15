
# Atualizar Edge Functions e Documentacao da API

## Resumo

Atualizar as Edge Functions de produtos e a documentacao da API para refletir os novos campos de atributos estruturados, variacoes e dominios adicionados na tabela `products`.

## O que sera feito

### 1. Atualizar Edge Function `api-produtos-cadastrar`
Adicionar suporte aos novos campos no endpoint de criacao de produtos:
- `attributes` (JSONB array) - com validacao de tipo
- `variations` (JSONB array) - com validacao de tipo
- `domain_id` (TEXT)
- `condition` (TEXT) - com validacao de valores permitidos
- `catalog_source`, `catalog_source_id` (TEXT)
- `has_variations` (calculado automaticamente)
- `enriched_at` (calculado automaticamente quando attributes preenchido)

O response tambem incluira os novos campos traduzidos para portugues (atributos, variacoes, dominio_id, condicao, etc.).

### 2. Atualizar Edge Function `api-produtos-listar`
Incluir novos campos no SELECT e no mapeamento de resposta:
- `attributes`, `variations`, `domain_id`, `condition`, `has_variations`, `enriched_at`
- Adicionar filtros opcionais: `domain_id`, `condition`, `has_variations`

### 3. Criar Edge Function `api-produtos-atributos`
Endpoint dedicado para gerenciar atributos de um produto individual:
- **PUT** - Adicionar/atualizar um atributo (valida contra `attribute_definitions`)
- Busca definicao do atributo, monta objeto estruturado, atualiza JSONB

### 4. Criar Edge Function `api-produtos-variacoes`
Endpoint dedicado para gerenciar variacoes de um produto:
- **POST** - Adicionar variacao (SKU, attributes, stock, price, gtin)
- **DELETE** (query param `sku`) - Remover variacao por SKU
- Atualiza automaticamente `has_variations` e `enriched_at`

### 5. Criar Edge Function `api-dominios-listar`
Endpoint para listar dominios de produto:
- **GET** - Lista dominios com filtros opcionais (category_id, active)

### 6. Criar Edge Function `api-atributos-listar`
Endpoint para listar definicoes de atributos:
- **GET** - Lista atributos com filtros (group, allows_variations)

### 7. Atualizar Documentacao da API (`apiEndpointsData.ts`)
Adicionar novos endpoints na categoria Catalogo:
- Atualizar exemplos de "Cadastrar Produto" e "Listar Produtos" com novos campos
- Adicionar endpoints: Gerenciar Atributos, Gerenciar Variacoes, Listar Dominios, Listar Atributos

### 8. Registrar novas funcoes no `config.toml`
Adicionar entradas `verify_jwt = false` para as 4 novas Edge Functions.

## Detalhes tecnicos

### Estrutura das novas Edge Functions

Todas seguem o padrao existente do projeto:
- Import `@supabase/supabase-js@2.57.4` (versao fixa)
- Autenticacao via `X-API-Key` header
- Validacao de permissoes (`produtos.read` / `produtos.write`)
- Logging via `logApiRequest` com campos `snake_case`
- CORS headers padrao
- Tratamento de erros consistente

### Mapeamento portugues nos campos do cadastrar/listar

Novos campos no request (portugues):
- `atributos` -> `attributes`
- `variacoes` -> `variations`
- `dominio_id` -> `domain_id`
- `condicao` -> `condition`
- `fonte_catalogo` -> `catalog_source`
- `fonte_catalogo_id` -> `catalog_source_id`

### Validacoes implementadas
- `atributos` deve ser array (se fornecido)
- `variacoes` deve ser array (se fornecido)
- `condicao` deve ser: new, used, refurbished, not_specified
- `has_variations` calculado automaticamente
- `enriched_at` setado quando attributes tem conteudo
- Endpoint de atributos valida existencia em `attribute_definitions`
- Endpoint de variacoes valida campos obrigatorios (sku, attributes, stock)

### Arquivos modificados
- `supabase/functions/api-produtos-cadastrar/index.ts` (atualizar)
- `supabase/functions/api-produtos-listar/index.ts` (atualizar)
- `supabase/functions/api-produtos-atributos/index.ts` (novo)
- `supabase/functions/api-produtos-variacoes/index.ts` (novo)
- `supabase/functions/api-dominios-listar/index.ts` (novo)
- `supabase/functions/api-atributos-listar/index.ts` (novo)
- `supabase/config.toml` (adicionar 4 novas funcoes)
- `src/data/apiEndpointsData.ts` (atualizar documentacao)
