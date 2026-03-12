

# Restaurar página Index em "/" e remover redirecionamento

## Problema
Atualmente `"/"` faz `<Navigate to="/categorias" />`, impedindo o acesso à página inicial. O usuário quer que `"/"` funcione normalmente como página.

## Alteração

### `src/App.tsx`
Reverter a rota raiz para renderizar o componente `Index`:

```tsx
// De:
<Route path="/" element={<Navigate to="/categorias" replace />} />

// Para:
<Route path="/" element={<Index />} />
```

### `src/components/Header.tsx`
Os links "Início" no header já apontam para `"/"`, então continuarão funcionando normalmente.

### `src/hooks/useAuthRedirect.ts`
Já trata `"/"` no fluxo de redirect pós-login (redireciona de `/auth` para `/`), então não precisa de alteração.

