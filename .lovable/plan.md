

## Corrigir URL de Redirecionamento do Reset de Senha

### Problema
O link de recuperacao de senha esta redirecionando para `lojafy.lovable.app/reset-password` ao inves de `lojafy.app/reset-password`.

### Solucao
Alterar a constante `REDIRECT_URL` no arquivo `supabase/functions/reset-password-proxy/index.ts`.

### Detalhes Tecnicos

**Arquivo**: `supabase/functions/reset-password-proxy/index.ts` (linha 12)

Alterar de:
```
const REDIRECT_URL = 'https://lojafy.lovable.app/reset-password';
```

Para:
```
const REDIRECT_URL = 'https://lojafy.app/reset-password';
```

Apos o deploy, os novos links de recovery gerados pela Admin API usarao o dominio correto.

