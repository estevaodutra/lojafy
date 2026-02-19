

## Corrigir envio dos tokens do katana - problema de RLS

### Problema

A query para buscar os tokens de integracao do usuario `katana.qualidade_0a@icloud.com` retorna 0 resultados (erro 406) porque a politica RLS da tabela `mercadolivre_integrations` so permite que cada usuario veja **seus proprios** dados. O usuario logado (`estevaodutra.pmss@gmail.com`) nao consegue ler os tokens do katana.

Os dados existem no banco - o katana tem uma integracao ativa com token valido ate 19/02/2026 18:15 UTC.

### Solucao

Criar uma edge function simples que usa o service role key para buscar os tokens de integracao de qualquer usuario, contornando a restricao de RLS. O componente chamara essa edge function em vez de fazer a query direta.

### Alteracoes

**1. Nova Edge Function: `supabase/functions/get-ml-integration/index.ts`**

- Recebe `user_id` no body (POST)
- Valida que o usuario autenticado e super_admin (consultando tabela profiles)
- Usa service role key para buscar na tabela `mercadolivre_integrations`
- Retorna `access_token`, `refresh_token`, `ml_user_id`, `expires_at`

**2. Modificar: `src/components/admin/CloneFromMarketplace.tsx`**

- Alterar `getMarketplaceIntegration()` para chamar a edge function `get-ml-integration` em vez de fazer query direta ao Supabase
- A edge function contorna o RLS e retorna os tokens corretamente
- Manter o `user_email` no payload

### Secao Tecnica

**Arquivos criados:**
- `supabase/functions/get-ml-integration/index.ts`

**Arquivos modificados:**
- `src/components/admin/CloneFromMarketplace.tsx` - trocar query direta por chamada a edge function
- `supabase/config.toml` - adicionar configuracao da nova edge function com `verify_jwt = false`

**Fluxo corrigido:**
1. Componente chama edge function `get-ml-integration` com `user_id` do katana
2. Edge function valida autenticacao e busca dados com service role key (sem restricao RLS)
3. Retorna tokens para o componente
4. Componente envia payload completo com tokens para o webhook n8n

