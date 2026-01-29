
# Plano: Controlar "Meus Acessos" por Feature

## Objetivo
Remover o item "Meus Acessos" dos menus de todos os usuários e controlar o acesso às páginas relacionadas via sistema de features. Apenas usuários com a feature `top_10_produtos` atribuída terão acesso.

---

## Alterações

### 1. Header.tsx — Remover Link do Dropdown e Menu Mobile

**Localização:** `src/components/Header.tsx`

Remover os seguintes blocos:
- Linhas ~134-139: Link "Meus Acessos" no dropdown desktop
- Linhas ~282-285: Link "Meus Acessos" no menu mobile

### 2. CustomerLayout.tsx — Remover do Menu Lateral

**Localização:** `src/components/customer/CustomerLayout.tsx`

Remover a linha:
```typescript
{ title: 'Meus Acessos', url: '/minha-conta/meus-acessos', icon: Rocket },
```

### 3. ResellerLayout.tsx — Remover Grupo do Menu

**Localização:** `src/components/layouts/ResellerLayout.tsx`

Remover o grupo inteiro "Meus Acessos":
```typescript
{
  label: 'Meus Acessos',
  items: [
    { title: 'Top 10 Produtos Vencedores', url: '/reseller/meus-acessos/top-produtos', icon: Trophy, badge: 'Novo' },
  ]
},
```

### 4. App.tsx — Proteger Rotas com FeatureRoute

**Localização:** `src/App.tsx`

Envolver as rotas de "Meus Acessos" com `FeatureRoute`:

```typescript
// Customer routes
<Route path="meus-acessos" element={
  <FeatureRoute feature="top_10_produtos">
    <ResellerMeusAcessos />
  </FeatureRoute>
} />
<Route path="meus-acessos/top-produtos" element={
  <FeatureRoute feature="top_10_produtos">
    <ResellerTopProdutosVencedores />
  </FeatureRoute>
} />

// Reseller routes (mesmo padrão)
<Route path="meus-acessos" element={
  <FeatureRoute feature="top_10_produtos">
    <ResellerMeusAcessos />
  </FeatureRoute>
} />
<Route path="meus-acessos/top-produtos" element={
  <FeatureRoute feature="top_10_produtos">
    <ResellerTopProdutosVencedores />
  </FeatureRoute>
} />
```

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Header.tsx` | Remover links "Meus Acessos" do dropdown e menu mobile |
| `src/components/customer/CustomerLayout.tsx` | Remover item do menu lateral |
| `src/components/layouts/ResellerLayout.tsx` | Remover grupo "Meus Acessos" do sidebar |
| `src/App.tsx` | Envolver rotas com `FeatureRoute` para controle de acesso |

---

## Resultado Final

- **Sem feature:** Usuário não vê "Meus Acessos" em nenhum menu e recebe tela de bloqueio se tentar acessar diretamente a URL
- **Com feature `top_10_produtos`:** Usuário pode acessar `/minha-conta/meus-acessos` diretamente (via link externo ou notificação)

---

## Fluxo de Liberação

1. Super Admin atribui a feature `top_10_produtos` ao usuário
2. Usuário recebe acesso às rotas protegidas
3. Usuário pode acessar via link direto (email, notificação, etc.)
