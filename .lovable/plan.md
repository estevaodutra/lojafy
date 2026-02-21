

## Corrigir Filtro "Top 10" no Catalogo do Revendedor

### Problema

O filtro "Top 10" no catalogo busca produtos da tabela `product_ranking`, que esta vazia. Porem, os 10 produtos foram vinculados na feature "Top 10 Produtos" (slug: `top_10_produtos`) atraves da tabela `feature_produtos`. Sao dois sistemas diferentes e o filtro esta apontando para o errado.

### Solucao

Alterar a query do filtro Top 10 no hook `useResellerCatalog.ts` para buscar os produtos da tabela `feature_produtos` vinculados a feature com slug `top_10_produtos`, em vez de buscar da tabela `product_ranking`.

### Alteracao

**Arquivo: `src/hooks/useResellerCatalog.ts`**

Substituir o bloco que busca de `product_ranking` (linhas 67-80) por:

```text
// Passo 1: buscar o ID da feature "top_10_produtos"
const { data: featureData } = await supabase
  .from('features')
  .select('id')
  .eq('slug', 'top_10_produtos')
  .maybeSingle();

// Passo 2: buscar os produto_ids vinculados a essa feature
if (featureData) {
  const { data: featureProdutos } = await supabase
    .from('feature_produtos')
    .select('produto_id')
    .eq('feature_id', featureData.id)
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .limit(10);
  topProductIds = featureProdutos?.map(r => r.produto_id) || [];
}
```

E na query principal, o `.in('id', topProductIds)` continua funcionando normalmente.

### Secao Tecnica

A mudanca e apenas na fonte de dados do filtro Top 10:

```text
ANTES: product_ranking -> product_id (tabela vazia)
DEPOIS: features (slug=top_10_produtos) -> feature_produtos -> produto_id (10 produtos vinculados)
```

Nenhuma outra alteracao necessaria -- o restante do fluxo (filtro `.in('id', topProductIds)` e early return quando vazio) permanece igual.

**Arquivo alterado:** `src/hooks/useResellerCatalog.ts`
