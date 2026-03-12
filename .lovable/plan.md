

# Redirecionar todos os usuários para "/" após login

## Alteração

### `src/hooks/useAuthRedirect.ts`
Remover o switch/case por role. Após login, **todos** os usuários são redirecionados para `/` (que já redireciona para `/categorias`):

```tsx
// Substituir todo o bloco switch (linhas 49-71) por:
setTimeout(() => {
  if (currentPath === '/auth') {
    navigate('/', { replace: true });
  }
}, 100);
```

Isso significa que ao fazer login, independente do role, o usuário vai para a página inicial/categorias. Os painéis (admin, reseller, etc.) continuam acessíveis via menu, mas não há redirecionamento automático.

