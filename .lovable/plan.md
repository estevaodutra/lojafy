

# Adicionar campo de link de referência externa no Gerenciamento de Produtos

## Problema
No modal "Gerenciar Produtos" do admin, cada produto listado não tem campo para informar o link de referência externa (ex: Mercado Livre). Esse link precisa ser salvo no banco e exibido na página do revendedor.

## Alterações

### 1. Banco de dados — Nova coluna na tabela `feature_produtos`
Adicionar coluna `reference_link` (text, nullable) via migration SQL:
```sql
ALTER TABLE feature_produtos ADD COLUMN reference_link text;
```

### 2. `src/integrations/supabase/types.ts`
Adicionar `reference_link` nos tipos Row, Insert e Update de `feature_produtos`.

### 3. `src/hooks/useFeatureProducts.ts`
- Adicionar `reference_link` à interface `FeatureProduct`
- Mapear o campo no retorno da query
- Criar mutation `updateReferenceLink` para salvar o link no banco

### 4. `src/components/admin/FeatureProductsModal.tsx`
- Adicionar um campo `Input` em cada `SortableItem` abaixo do SKU/preço para informar o link de referência
- Botão para abrir o link em nova aba (quando preenchido)
- Salvar automaticamente ao sair do campo (onBlur) ou com debounce

### 5. `src/pages/reseller/TopProdutosVencedores.tsx`
- Usar o `reference_link` do banco (vindo do `useFeatureProducts`) como valor inicial do campo "Referência Externa", em vez de depender apenas do localStorage

## Resultado
O superadmin poderá informar o link de referência diretamente no gerenciamento de produtos, e esse link aparecerá automaticamente para os revendedores na página Top Produtos.

