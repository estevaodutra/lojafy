

# Plano: Atualizar botões da sidebar

## Resumo

Atualizar o botão "Ver Minha Loja" para navegar para a URL pública da loja do revendedor (`/loja/{store_slug}`) e adicionar o botão "Ver Catálogo" que navega para `/`.

---

## Alterações

### Arquivo: `src/components/layouts/ResellerLayout.tsx`

1. **Importar** o hook `useResellerStore` para obter o `store_slug` da loja do revendedor

2. **Usar o hook** dentro do componente `ResellerSidebar`:
```typescript
const { store: resellerStore } = useResellerStore();
```

3. **Atualizar "Ver Minha Loja"** (linha 229) para navegar para `/loja/{store_slug}`:
```tsx
<button onClick={() => navigate(resellerStore?.store_slug ? `/loja/${resellerStore.store_slug}` : '/')}>
  <Store className="mr-2 h-4 w-4 text-primary" />
  <span className="font-medium text-primary">Ver Minha Loja</span>
</button>
```

4. **Adicionar "Ver Catálogo"** logo após "Ver Minha Loja", navegando para `/`:
```tsx
<SidebarMenuItem>
  <SidebarMenuButton asChild className="bg-primary/10 hover:bg-primary/20">
    <button onClick={() => navigate('/')}>
      <ShoppingBag className="mr-2 h-4 w-4 text-primary" />
      <span className="font-medium text-primary">Ver Catálogo</span>
    </button>
  </SidebarMenuButton>
</SidebarMenuItem>
```

---

## Resultado

A seção inferior da sidebar terá 3 botões:
1. **Ver Minha Loja** - navega para `/loja/topdanet` (slug dinâmico da loja)
2. **Ver Catálogo** - navega para `/`
3. **Sair** - faz logout

