
## Corrigir Envio do Link de Redefinicao de Senha

### Problema
O webhook n8n (`lojafy_reset_password`) esta apenas devolvendo os metadados da requisicao em vez de gerar o link de recovery e envia-lo ao usuario.

### Solucao
Modificar a Edge Function `reset-password-proxy` para:
1. Gerar o link de recovery diretamente usando a Supabase Admin API (`/auth/v1/admin/generate-link`)
2. Enviar o link gerado para o webhook n8n, que sera responsavel apenas pela **entrega** (WhatsApp, email, etc.)
3. Retornar sucesso/erro ao frontend

### Fluxo Corrigido

1. Usuario clica "Esqueci minha senha" e digita o email
2. Frontend chama a Edge Function `reset-password-proxy`
3. A Edge Function usa a `SUPABASE_SERVICE_ROLE_KEY` para chamar `POST /auth/v1/admin/generate-link` com `type: recovery` e `redirect_to: https://lojafy.lovable.app/reset-password`
4. A Edge Function extrai o link de recovery da resposta
5. A Edge Function envia o email + link para o webhook n8n (`lojafy_reset_password`)
6. O n8n recebe `{ email, reset_link }` e entrega ao usuario (WhatsApp, email, etc.)
7. A Edge Function retorna `{ message: "Link enviado" }` ao frontend

### Detalhes Tecnicos

**Arquivo modificado**: `supabase/functions/reset-password-proxy/index.ts`

Alteracoes:
- Adicionar chamada a Supabase Admin API usando `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` (ja disponiveis como env vars nas Edge Functions)
- Endpoint: `POST {SUPABASE_URL}/auth/v1/admin/generate-link`
- Body: `{ "type": "recovery", "email": "...", "redirect_to": "https://lojafy.lovable.app/reset-password" }`
- Header: `Authorization: Bearer {SERVICE_ROLE_KEY}`, `apikey: {SERVICE_ROLE_KEY}`
- Extrair `action_link` da resposta
- Enviar `{ email, reset_link: action_link }` para o webhook n8n
- Se o n8n falhar na entrega, ainda retornar sucesso (o link foi gerado)
- Se o email nao existir no Supabase, retornar mensagem generica (sem revelar se o email existe ou nao)

Nenhum outro arquivo precisa ser alterado. O frontend e a pagina `/reset-password` ja estao prontos.
