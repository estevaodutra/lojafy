

## Gerenciamento de Produtos por Feature

### Resumo

Permitir que o Superadmin vincule, ordene e gerencie produtos associados a cada feature (especialmente "Top 10 Produtos") diretamente no painel de Features.

### 1. Banco de Dados

**Nova tabela `feature_produtos`:**

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | UUID (PK) | Identificador unico |
| feature_id | UUID (FK features) | Feature vinculada |
| produto_id | UUID (FK products) | Produto vinculado |
| ordem | integer (default 0) | Posicao na lista |
| ativo | boolean (default true) | Se esta ativo |
| created_at | timestamptz | Data de criacao |

- Constraint UNIQUE(feature_id, produto_id)
- Indices em feature_id e produto_id
- RLS: apenas super_admin pode ler/inserir/atualizar/deletar

**Alteracao na tabela `features`:**

- Adicionar coluna `gerencia_produtos` boolean default false
- Adicionar coluna `limite_produtos` integer nullable

### 2. Alteracoes no Frontend

**Arquivo: `src/hooks/useFeatures.ts`**
- Incluir campos `gerencia_produtos` e `limite_produtos` na interface `Feature`
- Incluir no upsert mutation

**Arquivo: `src/hooks/useFeatureProducts.ts` (novo)**
- Hook dedicado para CRUD de produtos vinculados a uma feature
- Funcoes: listar, adicionar, remover, reordenar
- Query com join em `products` para trazer nome, SKU, preco, imagem

**Arquivo: `src/components/admin/FeatureCard.tsx`**
- Exibir indicador "X produtos vinculados" quando `gerencia_produtos = true`
- Adicionar opcao "Gerenciar Produtos" no DropdownMenu

**Arquivo: `src/components/admin/FeatureProductsModal.tsx` (novo)**
- Modal principal de gerenciamento de produtos
- Lista de produtos vinculados com drag-and-drop (usando @dnd-kit ja instalado)
- Botao para adicionar produtos
- Botao de remover por item (com confirmacao)
- Exibe nome, SKU, preco de cada produto

**Arquivo: `src/components/admin/AddProductsToFeatureModal.tsx` (novo)**
- Modal de busca e selecao de produtos
- Campo de busca com debounce
- Filtra produtos nao vinculados a feature
- Selecao multipla com checkbox
- Botao "Adicionar" insere os selecionados

**Arquivo: `src/pages/admin/Features.tsx`**
- Adicionar estado e handlers para abrir o modal de gerenciamento de produtos
- Passar callbacks para o FeatureCard

**Arquivo: `src/components/admin/FeatureFormModal.tsx`**
- Adicionar campos `gerencia_produtos` (Switch) e `limite_produtos` (Input number) no formulario de criacao/edicao

### 3. Secao Tecnica

**Fluxo de dados:**

```text
FeatureCard (menu "Gerenciar Produtos")
  -> FeatureProductsModal (lista com drag-and-drop)
    -> useFeatureProducts hook (CRUD via Supabase)
    -> AddProductsToFeatureModal (busca e adiciona)
```

**Drag and Drop:**
- Usa @dnd-kit/core + @dnd-kit/sortable (ja instalados)
- Ao soltar, atualiza campo `ordem` de todos os itens reordenados via batch update

**Queries principais:**

```text
-- Listar produtos da feature
SELECT fp.*, p.name, p.sku, p.price, p.image_url
FROM feature_produtos fp
JOIN products p ON p.id = fp.produto_id
WHERE fp.feature_id = ?
ORDER BY fp.ordem ASC

-- Buscar produtos para adicionar (excluindo ja vinculados)
SELECT p.*
FROM products p
WHERE p.active = true
  AND p.id NOT IN (SELECT produto_id FROM feature_produtos WHERE feature_id = ?)
  AND (p.name ILIKE '%termo%' OR p.sku ILIKE '%termo%')
LIMIT 20

-- Reordenar (batch upsert)
UPDATE feature_produtos SET ordem = ? WHERE id = ?
```

**RLS:**
- SELECT/INSERT/UPDATE/DELETE restritos a usuarios com role `super_admin` via `is_admin_user()`

**Arquivos criados:** 3 (1 hook + 2 componentes)
**Arquivos modificados:** 4 (FeatureCard, FeatureFormModal, Features page, useFeatures hook)
**Migracoes:** 1 (tabela + colunas + RLS)

