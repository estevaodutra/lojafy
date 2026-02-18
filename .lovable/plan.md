
## Adicionar indicador de marketplace na tabela admin de produtos

### Resumo
Mostrar um indicador visual (badges com icones dos marketplaces) na tabela de produtos do admin quando o produto tiver dados vinculados na tabela `product_marketplace_data`. O indicador aparecera na coluna "Produto", abaixo do nome/marca.

### Alteracoes

**1. `src/pages/admin/Products.tsx` - Query de produtos**
- Alterar a query que busca produtos para incluir um left join com `product_marketplace_data`
- Usar a sintaxe do Supabase: `product_marketplace_data(id, marketplace, listing_status)` no select
- Isso traz os marketplaces vinculados junto com cada produto, sem query adicional

**2. `src/components/admin/ProductTable.tsx` - Exibicao do indicador**
- Na celula "Produto" (linhas 572-588), apos a marca, adicionar uma linha com badges dos marketplaces vinculados
- Cada badge mostra o nome do marketplace com cor baseada no `listing_status`:
  - `active` = badge verde
  - `draft` = badge cinza
  - `pending` = badge amarela
  - `paused`/`error`/`closed` = badge vermelha
- Formato do badge: icone de loja + "ML" (Mercado Livre), "Shopee", "Amazon", etc.
- Se nao houver marketplaces vinculados, nada aparece (sem mudanca visual)

**3. Filtro opcional de marketplace**
- Adicionar um filtro dropdown na area de filtros para filtrar por marketplace vinculado
- Opcoes: "Todos", "Com marketplace", "Sem marketplace", "Mercado Livre", "Shopee", "Amazon"

### Detalhes tecnicos

**Query atualizada no Products.tsx:**
```text
supabase.from('products').select(`
  *,
  categories(name),
  product_marketplace_data(id, marketplace, listing_status)
`)
```

**Mapeamento de nomes de marketplace para exibicao:**
```text
mercadolivre -> ML
shopee -> Shopee
amazon -> Amazon
magalu -> Magalu
```

**Cores dos badges por status:**
```text
active   -> bg-green-100 text-green-800
draft    -> bg-gray-100 text-gray-800
pending  -> bg-yellow-100 text-yellow-800
paused   -> bg-orange-100 text-orange-800
error    -> bg-red-100 text-red-800
closed   -> bg-red-100 text-red-800
```

**Posicao na tabela:** Na coluna "Produto", abaixo da linha da marca, como uma terceira linha com badges pequenos inline.
