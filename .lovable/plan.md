
## Corrigir redirecionamento do link de recuperacao de senha

### Problema
O link de recuperacao agora redireciona corretamente para `https://lojafy.app`, mas o Supabase esta removendo o path `/reset-password` do `redirect_to`. Isso faz o usuario cair na pagina raiz (`/`) com os tokens de recovery no hash da URL, em vez de ir para `/reset-password` onde o formulario de nova senha esta.

### Solucao
Adicionar uma deteccao global no app que intercepta tokens de recovery na URL hash e redireciona automaticamente para `/reset-password`.

### Detalhes Tecnicos

**Arquivo**: `src/App.tsx` (ou componente raiz de roteamento)

Adicionar um `useEffect` no componente principal que:

1. Verifica se a URL hash contem `type=recovery` e `access_token`
2. Se sim, redireciona para `/reset-password` preservando o hash com os tokens

```typescript
useEffect(() => {
  const hash = window.location.hash;
  if (hash && hash.includes('type=recovery') && hash.includes('access_token')) {
    // Redirecionar para /reset-password mantendo o hash
    window.location.href = '/reset-password' + hash;
  }
}, []);
```

### Arquivos a editar
- `src/App.tsx` - Adicionar deteccao de recovery token no hash

### Resultado esperado
Quando o usuario clicar no link de recuperacao, sera redirecionado para `https://lojafy.app`, o app detectara o token de recovery no hash e redirecionara automaticamente para `/reset-password#access_token=...&type=recovery`, onde o formulario de nova senha funcionara normalmente.
