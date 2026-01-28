

# Liberar "Meus Acessos" para Todos os Usuários

## Resumo

Atualmente, a seção "Meus Acessos" está restrita apenas para usuários com role `reseller`. A proposta é liberar para **todos os usuários autenticados** (customer, reseller, supplier, admin, super_admin).

---

## Locais de Restrição Atual

| Local | Arquivo | Restrição |
|-------|---------|-----------|
| Dropdown do Header (Desktop) | `src/components/Header.tsx` | `role === 'reseller'` |
| Menu Mobile | `src/components/Header.tsx` | `role === 'reseller'` |
| Sidebar do Revendedor | `src/components/layouts/ResellerLayout.tsx` | Dentro do painel `/reseller` |
| Rotas | `src/App.tsx` | Dentro de `/reseller/*` com `RoleBasedRoute` |

---

## Alterações Propostas

### 1. Header.tsx - Remover Restrição de Role

**Desktop (linhas 134-149):**
```typescript
// ANTES:
{role === 'reseller' && (
  <>
    <DropdownMenuItem asChild>
      <Link to="/reseller/meus-acessos/top-produtos" className="w-full">
        <Rocket className="mr-2 h-4 w-4" />
        Meus Acessos
      </Link>
    </DropdownMenuItem>
    ...
  </>
)}

// DEPOIS:
{user && (
  <DropdownMenuItem asChild>
    <Link to="/minha-conta/meus-acessos" className="w-full">
      <Rocket className="mr-2 h-4 w-4" />
      Meus Acessos
    </Link>
  </DropdownMenuItem>
)}
```

**Mobile (linhas 284-295):**
```typescript
// ANTES:
{role === 'reseller' && (
  <>
    <Link to="/reseller/meus-acessos/top-produtos" ...>
      Meus Acessos
    </Link>
    ...
  </>
)}

// DEPOIS:
<Link to="/minha-conta/meus-acessos" ...>
  Meus Acessos
</Link>
```

### 2. CustomerLayout.tsx - Adicionar "Meus Acessos" no Menu

```typescript
// ANTES:
const baseMenuItems = [
  { title: 'Resumo', url: '/minha-conta', icon: User },
  { title: 'Meus Pedidos', url: '/minha-conta/pedidos', icon: Package },
  ...
];

// DEPOIS:
const baseMenuItems = [
  { title: 'Resumo', url: '/minha-conta', icon: User },
  { title: 'Meus Acessos', url: '/minha-conta/meus-acessos', icon: Rocket },
  { title: 'Meus Pedidos', url: '/minha-conta/pedidos', icon: Package },
  ...
];
```

### 3. App.tsx - Adicionar Rotas em /minha-conta

```typescript
// Dentro de <Route path="/minha-conta" element={<CustomerLayout />}>
<Route path="meus-acessos" element={<ResellerMeusAcessos />} />
<Route path="meus-acessos/top-produtos" element={<ResellerTopProdutosVencedores />} />
```

### 4. Ajustar Componente MeusAcessos.tsx

Atualizar a rota interna para usar o novo caminho:

```typescript
// ANTES:
route: '/reseller/meus-acessos/top-produtos',

// DEPOIS:
route: '/minha-conta/meus-acessos/top-produtos',
```

### 5. (Opcional) Manter no Painel Revendedor

As rotas no `/reseller/meus-acessos/*` podem ser mantidas para que revendedores também vejam a seção dentro do seu painel dedicado.

---

## Nova Estrutura de Navegação

```text
TODOS OS USUÁRIOS:
┌─────────────────────────────────────────────────┐
│ Dropdown do Header                              │
│ ├── Minha Conta                                 │
│ ├── Meus Acessos  ← NOVO (para todos)           │
│ └── Painel [Admin/Revendedor/etc]               │
└─────────────────────────────────────────────────┘

ÁREA MINHA CONTA (/minha-conta):
┌─────────────────────────────────────────────────┐
│ Sidebar                                         │
│ ├── Resumo                                      │
│ ├── Meus Acessos  ← NOVO                        │
│ ├── Meus Pedidos                                │
│ ├── Meus Tickets                                │
│ ├── Favoritos                                   │
│ ├── Meu Perfil                                  │
│ ├── Ajuda                                       │
│ └── Lojafy Academy (apenas resellers)           │
└─────────────────────────────────────────────────┘
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Header.tsx` | Remover condição `role === 'reseller'`, atualizar links |
| `src/components/customer/CustomerLayout.tsx` | Adicionar "Meus Acessos" no sidebar |
| `src/App.tsx` | Adicionar rotas em `/minha-conta` |
| `src/pages/reseller/MeusAcessos.tsx` | Atualizar rota interna |

---

## Seção Técnica

### Header.tsx - Alterações Detalhadas

**Linha 134-149 (Desktop):**
- Remover `{role === 'reseller' && (...)}`
- Manter apenas o link "Meus Acessos" sem condição de role
- Remover o link de "Lojafy Academy" que estava junto (continua disponível apenas para resellers via `/minha-conta/academy`)

**Linha 284-295 (Mobile):**
- Mesmo tratamento, remover a condição e manter apenas "Meus Acessos"

### CustomerLayout.tsx - Import e Menu

```typescript
// Adicionar import
import { Rocket } from 'lucide-react';

// Adicionar no baseMenuItems (após Resumo)
{ title: 'Meus Acessos', url: '/minha-conta/meus-acessos', icon: Rocket },
```

### App.tsx - Novas Rotas

```typescript
{/* Customer Panel Routes */}
<Route path="/minha-conta" element={<CustomerLayout />}>
  <Route index element={<CustomerDashboard />} />
  <Route path="meus-acessos" element={<ResellerMeusAcessos />} />
  <Route path="meus-acessos/top-produtos" element={<ResellerTopProdutosVencedores />} />
  <Route path="pedidos" element={<CustomerOrders />} />
  ...
</Route>
```

