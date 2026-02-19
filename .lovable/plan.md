

## Adicionar Coluna "Marketplace" na Tabela de Produtos

### Resumo

Mover os badges de marketplace que atualmente aparecem abaixo do nome do produto para uma coluna dedicada "Marketplace" na tabela. A coluna exibira icones/logos dos marketplaces vinculados ao produto (ML, Shopee, Amazon, Magalu) com indicador visual de status.

### Alteracoes

**Arquivo: `src/components/admin/ProductTable.tsx`**

1. Adicionar coluna "Marketplace" no `TableHeader` (entre "Estoque" e "Status")
2. Adicionar `TableCell` correspondente que exibe os icones dos marketplaces vinculados
3. Remover os `MarketplaceBadge` que atualmente ficam abaixo do nome do produto (linhas 635-641)
4. Atualizar o componente `MarketplaceBadge` para exibir como icone compacto (apenas o icone/logo com tooltip do nome do marketplace e status)

**Layout da nova coluna:**
- Produtos sem vinculo: celula vazia ou traco
- Produtos vinculados: icones dos marketplaces lado a lado (ex: icone ML verde = ativo, amarelo = pendente)
- Tooltip ao passar o mouse mostrando "Mercado Livre - active"

### Secao Tecnica

**Componente atualizado:**
- `MarketplaceBadge` sera simplificado para mostrar apenas o icone com cor de status
- A coluna tera largura fixa (`w-[100px]`) para manter o alinhamento
- Os icones usarao o componente `Store` do lucide-react com as cores de status ja definidas em `STATUS_CLASSES`
- Sera adicionado `Tooltip` para mostrar nome do marketplace e status ao hover

**Arquivo modificado:** `src/components/admin/ProductTable.tsx`

