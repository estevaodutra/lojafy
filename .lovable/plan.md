
# Plano: Mostrar "Meus Acessos" Apenas para Usuários com Feature

## Problema Identificado
No plano anterior, removemos completamente os links "Meus Acessos" de todos os menus. Isso fez com que mesmo usuários com a feature `top_10_produtos` atribuída não conseguissem ver o menu.

**O que deveria ter sido feito:** Condicionar a exibição do menu baseado na feature, não remover completamente.

---

## Solução

Vamos adicionar o item "Meus Acessos" de volta aos menus, mas condicionado à feature `top_10_produtos`:

### 1. Header.tsx — Dropdown Desktop e Menu Mobile

Adicionar verificação de feature e mostrar o link apenas para quem tem acesso:

```typescript
// Importar useFeature
import { useFeature } from '@/hooks/useFeature';

// Dentro do componente
const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');

// No dropdown desktop (após "Lojafy Academy")
{hasTop10Feature && (
  <DropdownMenuItem asChild>
    <Link to="/minha-conta/meus-acessos" className="w-full">
      <Rocket className="mr-2 h-4 w-4" />
      Meus Acessos
    </Link>
  </DropdownMenuItem>
)}

// No menu mobile (após "Lojafy Academy")
{hasTop10Feature && (
  <Link to="/minha-conta/meus-acessos" className="block py-2 pl-2 text-sm ...">
    <Rocket className="inline mr-2 h-4 w-4" />
    Meus Acessos
  </Link>
)}
```

### 2. CustomerLayout.tsx — Menu Lateral

Usar `useFeature` para condicionar o item no menu:

```typescript
// Importar useFeature e Rocket
import { useFeature } from '@/hooks/useFeature';
import { Rocket } from 'lucide-react';

// Dentro de CustomerSidebar
const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');

// No useMemo de menuItems
const menuItems = useMemo(() => {
  const items = [...baseMenuItems];
  
  if (profile?.role === 'reseller') {
    items.push({ title: 'Lojafy Academy', ... });
  }
  
  // Adicionar Meus Acessos se tem a feature
  if (hasTop10Feature) {
    items.push({ title: 'Meus Acessos', url: '/minha-conta/meus-acessos', icon: Rocket });
  }
  
  return items;
}, [profile?.role, hasTop10Feature]);
```

### 3. ResellerLayout.tsx — Sidebar do Revendedor

Adicionar grupo "Meus Acessos" condicionado pela feature:

```typescript
// Importar Trophy e useFeature
import { Trophy } from 'lucide-react';
import { useFeature } from '@/hooks/useFeature';

// Dentro de ResellerSidebar
const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');

// Filtrar menuGroups dinamicamente
const filteredMenuGroups = useMemo(() => {
  const groups = [...menuGroups];
  
  if (hasTop10Feature) {
    // Adicionar grupo "Meus Acessos" antes de "Avançado"
    const advancedIndex = groups.findIndex(g => g.label === 'Avançado');
    groups.splice(advancedIndex, 0, {
      label: 'Meus Acessos',
      items: [
        { title: 'Top 10 Produtos Vencedores', url: '/reseller/meus-acessos/top-produtos', icon: Trophy, badge: 'Novo' },
      ]
    });
  }
  
  return groups;
}, [hasTop10Feature]);
```

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/components/Header.tsx` | Adicionar `useFeature` e mostrar "Meus Acessos" condicionalmente |
| `src/components/customer/CustomerLayout.tsx` | Adicionar item "Meus Acessos" quando `hasTop10Feature` é true |
| `src/components/layouts/ResellerLayout.tsx` | Adicionar grupo "Meus Acessos" dinamicamente baseado na feature |

---

## Resultado Final

| Situação | Menu "Meus Acessos" |
|----------|---------------------|
| Usuário sem feature | ❌ Não aparece em nenhum menu |
| Usuário com `top_10_produtos` | ✅ Aparece no Header, CustomerLayout e ResellerLayout |
| Acesso direto via URL sem feature | 🔒 Bloqueado pelo FeatureRoute (já implementado) |
