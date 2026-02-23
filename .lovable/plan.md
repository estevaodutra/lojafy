

## Corrigir reset de senha - Bypass do redirect do Supabase

### Problema raiz
O endpoint `/auth/v1/verify` do Supabase sempre redireciona para o **Site URL** configurado no dashboard (que esta como `localhost:3000`), ignorando o parametro `redirect_to`. Mesmo configurando corretamente, o Supabase tem esse comportamento.

### Solucao
Parar de enviar o `action_link` do Supabase no email. Em vez disso, extrair o `token_hash` da resposta do `generateLink` e construir um link direto para `https://lojafy.app/reset-password?token_hash=XXX&type=recovery`. No frontend, usar `verifyOtp()` para validar o token e criar a sessao.

### Arquivos a editar

**1. Edge Function: `supabase/functions/reset-password-proxy/index.ts`**
- Extrair `hashed_token` da resposta do `generateLink` (disponivel em `linkData.properties.hashed_token`)
- Construir link customizado: `https://lojafy.app/reset-password?token_hash={hashed_token}&type=recovery`
- Enviar esse link customizado para o webhook n8n em vez do `action_link` do Supabase

**2. Frontend: `src/pages/ResetPassword.tsx`**
- Adicionar deteccao de query params `token_hash` e `type=recovery`
- Quando encontrar esses params, chamar `supabase.auth.verifyOtp({ token_hash, type: 'recovery' })` para estabelecer a sessao
- Manter o fallback existente para hash params (compatibilidade)

**3. Remover interceptor: `src/App.tsx`**
- Remover o `useEffect` de interceptacao de recovery tokens adicionado anteriormente, pois nao sera mais necessario

### Detalhes tecnicos

**Edge Function (mudanca principal):**
```typescript
// Antes: enviava o action_link do Supabase
const resetLink = linkData.properties.action_link;

// Depois: constroi link direto com token_hash
const tokenHash = linkData.properties.hashed_token;
const resetLink = `https://lojafy.app/reset-password?token_hash=${tokenHash}&type=recovery`;
```

**Frontend (ResetPassword.tsx):**
```typescript
// Adicionar verificacao por query params
const searchParams = new URLSearchParams(window.location.search);
const tokenHash = searchParams.get('token_hash');
const type = searchParams.get('type');

if (type === 'recovery' && tokenHash) {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'recovery',
  });
  // Se sucesso, sessionReady = true
}
```

### Fluxo apos a correcao

1. Usuario clica "Esqueci minha senha"
2. Edge Function gera token via `generateLink`
3. Edge Function constroi link direto: `https://lojafy.app/reset-password?token_hash=XXX&type=recovery`
4. Link e enviado por email via webhook n8n
5. Usuario clica no link, vai direto para `/reset-password`
6. Frontend detecta query params, chama `verifyOtp` para criar sessao
7. Formulario de nova senha aparece
8. Sem nenhuma dependencia do redirect do Supabase

### Resultado esperado
O fluxo de reset de senha funcionara independentemente da configuracao do Site URL no Supabase Dashboard, eliminando o problema de `localhost` de vez.

