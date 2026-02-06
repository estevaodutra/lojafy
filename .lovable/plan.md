

# Plano: Corrigir redirecionamento do "Ver Catálogo"

## Problema

O botão "Ver Catálogo" navega para `/`, mas a página Index usa o hook `useAuthRedirect` que detecta o role `reseller` e redireciona automaticamente de volta para `/reseller`. Por isso parece que o botão não funciona.

## Solução

Passar um parâmetro na navegação para que a página Index saiba que o revendedor quer ver o catálogo e não deve ser redirecionado. Usaremos um query parameter `?viewCatalog=true`.

## Alterações

### 1. `src/components/layouts/ResellerLayout.tsx`
- Alterar o `navigate('/')` do botão "Ver Catálogo" para `navigate('/?viewCatalog=true')`

### 2. `src/hooks/useAuthRedirect.ts`
- Verificar se o parâmetro `viewCatalog` está presente na URL
- Se estiver, pular o redirecionamento automático para permitir que o revendedor veja o catálogo

---

## Detalhes Técnicos

No `useAuthRedirect.ts`, adicionar verificação antes do redirect:

```typescript
const searchParams = new URLSearchParams(location.search);
if (searchParams.get('viewCatalog') === 'true') return;
```

No `ResellerLayout.tsx`, atualizar a navegação:

```tsx
<button onClick={() => navigate('/?viewCatalog=true')}>
```

Isso permite que revendedores acessem o catálogo público quando desejam, sem quebrar o redirecionamento automático padrão ao fazer login.

