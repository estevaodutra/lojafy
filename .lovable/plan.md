

# Migrar Edge Function `products` de JWT para X-API-Key

## Problema
A Edge Function `products/index.ts` usa autenticacao JWT (Bearer token), mas o padrao do projeto e autenticacao via X-API-Key com service role key -- igual as demais funcoes `api-produtos-*`.

## O que sera feito

### 1. Atualizar `supabase/functions/products/index.ts`
Trocar a autenticacao de JWT para X-API-Key, seguindo o mesmo padrao das funcoes existentes (`api-produtos-listar`, `api-produtos-cadastrar`, etc.):

- Substituir criacao do client de `SUPABASE_ANON_KEY` para `SUPABASE_SERVICE_ROLE_KEY`
- Remover logica de Bearer token e `supabase.auth.getUser()`
- Adicionar validacao de `X-API-Key` header contra tabela `api_keys`
- Verificar permissao `produtos.read` (GET) ou `produtos.write` (POST/PUT/DELETE)
- Atualizar `last_used` da chave
- Adicionar header `x-api-key` no CORS `Access-Control-Allow-Headers`
- Adicionar log de requisicao via `logApiRequest` no `finally` block
- Ajustar `handleApprove` para nao depender de `user.id` (usar `apiKeyData.user_id` no lugar)

### 2. Atualizar documentacao em `src/data/apiEndpointsData.ts`
- Renomear categoria de "Produtos (JWT)" para "Produtos (REST)"
- Trocar todos os headers de `Authorization: Bearer eyJ...` para `X-API-Key: sk_sua_chave`
- Atualizar id de `products-jwt` para `products-rest`

## Detalhes tecnicos

### Padrao de autenticacao (copiado das funcoes existentes)

```text
1. Ler header X-API-Key
2. Buscar em api_keys WHERE api_key = key AND active = true
3. Verificar permissoes: permissions.produtos.read ou .write
4. Atualizar last_used
5. Criar client com SUPABASE_SERVICE_ROLE_KEY (acesso total, sem RLS)
```

### Permissoes por metodo
- GET: requer `produtos.read`
- POST, PUT, DELETE: requer `produtos.write`

### Arquivos modificados
- `supabase/functions/products/index.ts` -- autenticacao e logging
- `src/data/apiEndpointsData.ts` -- documentacao (headers e titulo)

