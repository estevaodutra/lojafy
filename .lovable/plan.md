

## Redesign do Processo de Redefinicao de Senha

### Visao Geral

Substituir o fluxo atual (que usa `supabase.auth.resetPasswordForEmail` diretamente) por um fluxo via webhook n8n, e criar a pagina `/reset-password` que falta para o usuario definir a nova senha.

### Componentes do Plano

#### 1. Criar Edge Function `reset-password-proxy`

Seguindo o padrao existente de proxies (como `clone-advertise-proxy`), criar `supabase/functions/reset-password-proxy/index.ts` que:
- Recebe `{ email }` no body
- Encaminha para `https://n8n-n8n.nuwfic.easypanel.host/webhook/lojafy_reset_password`
- Aguarda resposta e retorna ao frontend

#### 2. Registrar no `supabase/config.toml`

Adicionar:
```toml
[functions.reset-password-proxy]
verify_jwt = false
```

#### 3. Modificar `resetPassword` no `AuthContext.tsx`

Substituir a chamada `supabase.auth.resetPasswordForEmail` por uma chamada ao proxy:
```
supabase.functions.invoke('reset-password-proxy', { body: { email } })
```
Aguardar a resposta do webhook e tratar sucesso/erro baseado no retorno.

#### 4. Criar pagina `/reset-password` (ResetPassword.tsx)

Nova pagina em `src/pages/ResetPassword.tsx` que:
- Detecta o token de recovery na URL (hash `type=recovery`)
- Chama `supabase.auth.setSession()` com os tokens do hash
- Exibe formulario para nova senha (com confirmacao)
- Chama `supabase.auth.updateUser({ password })` para salvar
- Redireciona para `/auth` apos sucesso

#### 5. Adicionar rota no `App.tsx`

Registrar `<Route path="/reset-password" element={<ResetPassword />} />` como rota publica.

### Fluxo Completo

1. Usuario clica "Esqueci minha senha" na tela de login
2. Digita o email e clica "Enviar"
3. Frontend chama o proxy edge function
4. Proxy encaminha para o webhook n8n
5. n8n gera o link de reset (via Supabase Admin API) e envia por email/WhatsApp
6. Frontend exibe mensagem de sucesso baseada na resposta do webhook
7. Usuario clica no link recebido, e redirecionado para `/reset-password`
8. Pagina extrai os tokens da URL, autentica o usuario, exibe formulario de nova senha
9. Apos definir a nova senha, redireciona para `/auth`

### Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| `supabase/functions/reset-password-proxy/index.ts` | Criar |
| `supabase/config.toml` | Adicionar entrada |
| `src/contexts/AuthContext.tsx` | Modificar `resetPassword` |
| `src/pages/ResetPassword.tsx` | Criar |
| `src/App.tsx` | Adicionar rota |

