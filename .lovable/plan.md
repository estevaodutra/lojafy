
# Plano: Adicionar Atalho da Lojafy Academy no Menu do Revendedor

## Objetivo

Adicionar um item de menu "Lojafy Academy" no painel lateral do revendedor, visível apenas para usuários que possuem a feature `lojafy_academy` ativa.

---

## Alterações

### Arquivo: `src/components/layouts/ResellerLayout.tsx`

**1. Adicionar import do ícone GraduationCap (linha 3-24):**

```tsx
import { 
  // ... imports existentes ...
  GraduationCap  // Adicionar este
} from 'lucide-react';
```

**2. Adicionar verificação da feature lojafy_academy (linha 92):**

```tsx
const { hasFeature: hasTop10Feature } = useFeature('top_10_produtos');
const { hasFeature: hasAcademyFeature } = useFeature('lojafy_academy');
```

**3. Atualizar filteredMenuGroups para incluir Academy (linhas 95-109):**

Adicionar um grupo "Aprendizado" com o link da Academy, antes do grupo "Meus Acessos":

```tsx
const filteredMenuGroups = useMemo(() => {
  const groups = [...menuGroups];
  
  // Adicionar Academy apenas para quem tem a feature
  if (hasAcademyFeature) {
    const advancedIndex = groups.findIndex(g => g.label === 'Avançado');
    groups.splice(advancedIndex, 0, {
      label: 'Aprendizado',
      items: [
        { title: 'Lojafy Academy', url: '/minha-conta/academy', icon: GraduationCap },
      ]
    });
  }
  
  // Adicionar Meus Acessos apenas para quem tem a feature
  if (hasTop10Feature) {
    const advancedIndex = groups.findIndex(g => g.label === 'Avançado');
    groups.splice(advancedIndex, 0, {
      label: 'Meus Acessos',
      items: [
        { title: 'Top 10 Produtos Vencedores', url: '/reseller/meus-acessos/top-produtos', icon: Trophy, badge: 'Novo' },
      ]
    });
  }
  
  return groups;
}, [hasTop10Feature, hasAcademyFeature]);
```

---

## Layout Visual Esperado

```
┌────────────────────────────┐
│ Revendedor          [PRO]  │
├────────────────────────────┤
│ Principal                  │
│   Dashboard                │
├────────────────────────────┤
│ Produtos                   │
│   Catálogo                 │
│   Meus Produtos            │
├────────────────────────────┤
│ Vendas & Finanças          │
│   ...                      │
├────────────────────────────┤
│ Minha Loja                 │
│   ...                      │
├────────────────────────────┤
│ Aprendizado       ← NOVO   │
│   🎓 Lojafy Academy        │
├────────────────────────────┤
│ Avançado                   │
│   Integrações              │
├────────────────────────────┤
│ Ver Minha Loja             │
│ Sair                       │
└────────────────────────────┘
```

---

## Observações

- A rota `/minha-conta/academy` já existe e está protegida pela feature `lojafy_academy`
- O ícone `GraduationCap` é o mesmo usado no CustomerLayout para consistência visual
- O item só aparece para usuários com a feature ativa (igual ao padrão já existente para Top 10 Produtos)

---

## Resumo das Alterações

| Linha | Alteração |
|-------|-----------|
| 4-24 | Adicionar import `GraduationCap` |
| 92 | Adicionar `hasAcademyFeature` via useFeature |
| 95-109 | Adicionar grupo "Aprendizado" com link da Academy |
