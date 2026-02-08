

# Correção do Fluxo de Link Único

## Problemas Identificados

1. **Tipo errado no `verifyOtp`**: O frontend usa `type: 'email'` mas o token foi gerado como `type: 'magiclink'`. Isso causa falha no método primário de autenticação.

2. **Fallback fragil**: Quando `verifyOtp` falha, o codigo redireciona para o `magic_link` bruto do Supabase. Esse redirecionamento depende da configuração de Redirect URLs no Supabase e pode falhar com "requested path is invalid".

3. **Token consumido sem login**: A edge function marca o token como `used: true` **antes** de tentar criar a sessão. Se a autenticação falha depois, o token já foi consumido e o usuário não pode tentar novamente.

## Correções Planejadas

### 1. Frontend - `src/pages/AuthOneTime.tsx`

- Corrigir `type: 'email'` para `type: 'magiclink'` no `verifyOtp` (linha 49)
- Adicionar tentativa com `email_otp` como alternativa (usar `verifyOtp` com `email` e `token` ao inves de `token_hash`)
- Melhorar tratamento de erro com mensagens mais descritivas para o usuário

**Fluxo corrigido:**
```text
1. Tentar verifyOtp com token_hash + type 'magiclink'
2. Se falhar, tentar verifyOtp com email + token (email_otp)
3. Se falhar, redirecionar para magic_link como ultimo recurso
4. Se tudo falhar, mostrar erro com botao para login manual
```

### 2. Edge Function - `supabase/functions/verify-onetime-link/index.ts`

- Reordenar o fluxo: verificar o token, gerar o magic link, e so marcar como `used` **depois** de gerar o magic link com sucesso
- Retornar o `email` do usuario na resposta para que o frontend possa usar `verifyOtp` com email + token
- Adicionar logs mais detalhados para facilitar debug futuro

### 3. Verificação de Redirect URLs

- O usuario precisa verificar que as seguintes URLs estão na lista de Redirect URLs permitidas no Supabase Auth:
  - `https://lojafy.lovable.app/reseller/first-access`
  - `https://lojafy.lovable.app/reseller/onboarding`
  - `https://lojafy.lovable.app/**` (wildcard recomendado)

## Detalhes Técnicos

### Alteração no `AuthOneTime.tsx`

```typescript
// ANTES (incorreto)
const { error: signInError } = await supabase.auth.verifyOtp({
  token_hash: data.hashed_token,
  type: 'email',
});

// DEPOIS (corrigido - tentativa 1)
const { error: signInError } = await supabase.auth.verifyOtp({
  token_hash: data.hashed_token,
  type: 'magiclink',
});

// Se falhar, tentativa 2 com email_otp
if (signInError && data.email_otp && data.email) {
  const { error: otpError } = await supabase.auth.verifyOtp({
    email: data.email,
    token: data.email_otp,
    type: 'magiclink',
  });
  // Se ainda falhar, tentar redirect via magic_link
}
```

### Alteração no `verify-onetime-link/index.ts`

Adicionar `email` na resposta:
```typescript
return new Response(
  JSON.stringify({
    success: true,
    redirect_url: tokenRecord.redirect_url || "/reseller/onboarding",
    magic_link: linkData.properties.action_link,
    email_otp: linkData.properties.email_otp,
    hashed_token: linkData.properties.hashed_token,
    email: userData.user.email, // NOVO: para fallback com verifyOtp
  }),
  ...
);
```

### Arquivos Modificados

1. **`src/pages/AuthOneTime.tsx`** - Corrigir tipo do `verifyOtp` e adicionar fallbacks robustos
2. **`supabase/functions/verify-onetime-link/index.ts`** - Retornar email do usuario e melhorar logs

### Ação Manual Necessária

Verificar no Supabase Dashboard (Authentication > URL Configuration) que as Redirect URLs incluem:
- `https://lojafy.lovable.app/**`

