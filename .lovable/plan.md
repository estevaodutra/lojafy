

# Plano: Menu lateral com categorias colapsáveis

## Resumo

Transformar cada grupo de menu na sidebar do Revendedor em seções colapsáveis (collapsible), permitindo expandir/recolher cada categoria clicando no label do grupo.

---

## Comportamento

- Cada categoria do menu (Principal, Produtos, Vendas & Finanças, etc.) terá um ícone de seta (chevron) indicando se está expandida ou recolhida
- Clicar no label da categoria expande/recolhe os itens dentro dela
- A categoria que contém a rota ativa ficará automaticamente aberta
- As demais categorias iniciarão fechadas por padrão
- A seção inferior (Ver Minha Loja / Sair) permanece fixa sem collapse

---

## Alterações Necessárias

### Arquivo: `src/components/layouts/ResellerLayout.tsx`

1. **Importar** `Collapsible`, `CollapsibleContent`, `CollapsibleTrigger` de `@/components/ui/collapsible` e ícones `ChevronRight`/`ChevronDown` de `lucide-react`

2. **Adicionar estado** para controlar quais categorias estão abertas, inicializando com base na rota ativa:

```typescript
const [openCategories, setOpenCategories] = useState<Set<string>>(() => {
  // Abre automaticamente a categoria que contém a rota ativa
  const initial = new Set<string>();
  filteredMenuGroups.forEach(group => {
    if (group.items.some(item => currentPath === item.url)) {
      initial.add(group.label);
    }
  });
  return initial;
});
```

3. **Envolver cada SidebarGroup** com `Collapsible`, usando o label como trigger clicável:

```tsx
{filteredMenuGroups.map((group) => (
  <Collapsible
    key={group.label}
    open={openCategories.has(group.label)}
    onOpenChange={(open) => {
      setOpenCategories(prev => {
        const next = new Set(prev);
        if (open) next.add(group.label);
        else next.delete(group.label);
        return next;
      });
    }}
  >
    <SidebarGroup>
      <CollapsibleTrigger asChild>
        <SidebarGroupLabel className="cursor-pointer flex justify-between">
          {group.label}
          {isOpen ? <ChevronDown /> : <ChevronRight />}
        </SidebarGroupLabel>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {/* itens do menu */}
          </SidebarMenu>
        </SidebarGroupContent>
      </CollapsibleContent>
    </SidebarGroup>
  </Collapsible>
))}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layouts/ResellerLayout.tsx` | Envolver cada grupo de menu com Collapsible para torná-los colapsáveis |

---

## Resultado Esperado

1. Cada categoria mostra uma seta (chevron) ao lado do label
2. Clicar no label expande/recolhe os itens da categoria
3. A categoria da página atual abre automaticamente
4. A experiência é mais organizada, especialmente em telas menores
5. Seção "Ver Minha Loja" e "Sair" permanecem sempre visíveis

