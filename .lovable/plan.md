

# Redirecionar "/" para "/categorias"

## Alteração

### `src/App.tsx`
Substituir a rota `"/"` que renderiza `<Index />` por um `<Navigate to="/categorias" replace />`:

```tsx
// De:
<Route path="/" element={<Index />} />

// Para:
<Route path="/" element={<Navigate to="/categorias" replace />} />
```

Importar `Navigate` de `react-router-dom` (já deve estar importado, mas verificarei).

O hook `useAuthRedirect` que roda dentro do `Index` precisará ser movido ou replicado na página `Categorias` para que usuários autenticados (admin, reseller, etc.) continuem sendo redirecionados ao seu painel. Vou verificar se `Categorias` já possui esse comportamento ou se precisa ser adicionado.

### `src/pages/Categorias.tsx`
Adicionar `useAuthRedirect()` caso ainda não tenha, para manter o redirecionamento automático por role.

