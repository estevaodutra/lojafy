

# Plano: Incluir Link de Acesso Unico na Resposta do Cadastro de Usuario

## Objetivo

Modificar o endpoint `api-usuarios-cadastrar` para gerar automaticamente um link de acesso unico quando um usuario for criado, retornando esse link na resposta da API.

## Alteracao Proposta

### Arquivo: `supabase/functions/api-usuarios-cadastrar/index.ts`

**Logica a adicionar apos a criacao do usuario:**

1. Gerar um UUID como token de acesso unico
2. Definir expiracao de 24 horas
3. Inserir registro na tabela `one_time_access_tokens`
4. Incluir o link na resposta da API

### Estrutura do Codigo

```typescript
// Apos criar usuario e atualizar perfil...

// Gerar link de acesso unico
const accessToken = crypto.randomUUID();
const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

const { error: tokenError } = await supabase
  .from('one_time_access_tokens')
  .insert({
    user_id: authData.user.id,
    token: accessToken,
    expires_at: tokenExpiresAt.toISOString(),
    created_by: keyData.user_id, // Admin dono da API key
    redirect_url: '/reseller/onboarding'
  });

// Montar link
const accessLink = `https://lojafy.lovable.app/auth/onetime?token=${accessToken}`;
```

### Resposta Atualizada

A resposta JSON incluira dois novos campos:

```json
{
  "success": true,
  "message": "Usuário criado com sucesso",
  "data": {
    "user_id": "...",
    "email": "...",
    "full_name": "...",
    "role": "reseller",
    "subscription_plan": "premium",
    "subscription_expires_at": "2026-02-28T...",
    "subscription_days_granted": 30,
    "created_at": "2026-01-30T...",
    "access_link": "https://lojafy.lovable.app/auth/onetime?token=abc123...",
    "access_link_expires_at": "2026-01-31T..."
  }
}
```

## Consideracoes

| Aspecto | Detalhes |
|---------|----------|
| Seguranca | Token expira em 24h e e de uso unico |
| Auditoria | `created_by` registra o dono da API key |
| Falha | Se a geracao do token falhar, o usuario ainda sera criado (log de erro, sem bloquear) |
| Redirect | Por padrao redireciona para `/reseller/onboarding` |

## Fluxo Completo

```text
1. Cliente chama POST /api-usuarios-cadastrar com X-API-Key
2. Sistema cria usuario no auth.users
3. Sistema atualiza perfil na tabela profiles
4. Sistema gera token de acesso unico
5. Sistema insere token na tabela one_time_access_tokens
6. Sistema retorna resposta com user_id + access_link
7. Cliente pode enviar access_link para o novo usuario
8. Usuario clica no link e acessa automaticamente
```

## Arquivo a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `supabase/functions/api-usuarios-cadastrar/index.ts` | Adicionar geracao de token e link na resposta |

