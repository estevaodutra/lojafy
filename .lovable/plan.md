

# Criar Edge Function Unificada `products`

## Resumo

Criar uma nova Edge Function `products/index.ts` que consolida todos os endpoints de produtos em uma unica funcao com roteamento baseado em path e autenticacao JWT. Esta funcao opera em paralelo com as funcoes existentes baseadas em X-API-Key (que continuam funcionando para integracao externa).

## O que sera feito

### 1. Criar `supabase/functions/products/index.ts`
Uma Edge Function unificada com 12 endpoints, usando autenticacao JWT (via `Authorization: Bearer` header) e roteamento por path/method:

| Metodo | Path | Descricao |
|--------|------|-----------|
| POST | `/products` | Criar produto |
| GET | `/products` | Listar produtos (filtros + paginacao) |
| GET | `/products/pending` | Produtos aguardando aprovacao |
| GET | `/products/:id` | Buscar produto por ID |
| PUT | `/products/:id` | Atualizar produto (completo) |
| DELETE | `/products/:id` | Remover produto |
| PUT | `/products/:id/attributes` | Adicionar/atualizar atributo |
| POST | `/products/:id/variations` | Adicionar variacao |
| PUT | `/products/:id/variations/:sku` | Atualizar variacao |
| DELETE | `/products/:id/variations/:sku` | Remover variacao |
| POST | `/products/:id/approve` | Aprovar produto |
| POST | `/products/:id/reject` | Rejeitar produto |

### 2. Registrar em `supabase/config.toml`
Adicionar entrada `[functions.products]` com `verify_jwt = false` (validacao no codigo).

### 3. Atualizar documentacao em `src/data/apiEndpointsData.ts`
Adicionar nova secao "API REST Produtos (JWT)" documentando os novos endpoints unificados.

## Detalhes tecnicos

### Autenticacao
- Usa `supabase.auth.getUser()` com token JWT do header Authorization
- Diferente das funcoes `api-*` que usam X-API-Key + service role
- Ambos os sistemas coexistem: X-API-Key para integracao externa, JWT para uso interno do app

### Padrao do projeto
- Import fixo: `@supabase/supabase-js@2.57.4`
- CORS headers padrao
- Criacao do client com `SUPABASE_URL` e `SUPABASE_ANON_KEY` (nao service role, pois respeita RLS)
- Roteamento manual via `url.pathname.split("/")`

### Campos suportados no POST/PUT
Todos os campos da tabela `products` incluindo os novos:
- `attributes` (JSONB array), `variations` (JSONB array), `domain_id`, `condition`, `has_variations` (auto), `catalog_source`, `catalog_source_id`, `enriched_at` (auto)

### Validacoes
- `name` obrigatorio e nao vazio (POST)
- `price` obrigatorio e > 0 (POST)
- `attributes` deve ser array
- `variations` deve ser array
- `condition` deve ser: new, used, refurbished, not_specified
- `has_variations` calculado automaticamente
- `enriched_at` atualizado automaticamente quando attributes modificado
- Variacao: `sku`, `attributes` (objeto), `stock >= 0` obrigatorios
- Atributo: valida existencia em `attribute_definitions`

### Arquivos modificados
- `supabase/functions/products/index.ts` (novo)
- `supabase/config.toml` (adicionar products)
- `src/data/apiEndpointsData.ts` (documentacao)

### Funcoes existentes mantidas
As funcoes `api-produtos-cadastrar`, `api-produtos-listar`, `api-produtos-atributos`, `api-produtos-variacoes` e `api-produtos-aguardando-aprovacao` continuam funcionando normalmente para integracao via X-API-Key.
