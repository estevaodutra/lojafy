

## Remover Collapse de "Principal" e "Produtos"

### O que muda
Os grupos "Principal" e "Produtos" no menu lateral do revendedor ficarao sempre abertos, sem o icone de seta e sem possibilidade de colapsar. Os demais grupos continuam colapsaveis normalmente.

### Detalhes Tecnicos

**Arquivo**: `src/components/layouts/ResellerLayout.tsx`

Na renderizacao dos grupos do menu (linhas ~138-175), adicionar uma condicao: se o grupo for "Principal" ou "Produtos", renderizar sem o wrapper `Collapsible` e sem o `CollapsibleTrigger`/`CollapsibleContent`, mostrando os itens diretamente. Para os demais grupos, manter o comportamento colapsavel atual.

Logica:
```
if (group.label === 'Principal' || group.label === 'Produtos') {
  // Renderizar SidebarGroup com SidebarGroupLabel simples (sem seta)
  // e SidebarGroupContent sempre visivel
} else {
  // Manter Collapsible atual
}
```

