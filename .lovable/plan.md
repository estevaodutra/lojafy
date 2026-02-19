
## Adicionar Campos Originais do Produto + Comparacao + Restauracao

### Resumo

Adicionar campos `original_name`, `original_description`, `original_images` e `original_saved_at` na tabela `products` para preservar a versao original do produto antes de otimizacoes. Inclui componente de comparacao, botao de restauracao e protecao nos endpoints de criacao/edicao.

---

### 1. Migracao - Adicionar Colunas e Popular Dados Existentes

Uma unica migracao SQL que:
- Adiciona as 4 colunas na tabela `products`
- Popula os dados existentes copiando `name`, `description`, `images` e `created_at` para os campos `original_*`
- Cria indice para consultas

```text
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_images JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_saved_at TIMESTAMPTZ;

UPDATE products SET original_name = name, original_description = description, 
  original_images = images, original_saved_at = created_at 
WHERE original_name IS NULL;

CREATE INDEX IF NOT EXISTS idx_products_has_original ON products((original_name IS NOT NULL));
```

---

### 2. Proteger Campos no ProductForm (Frontend)

**Arquivo: `src/components/admin/ProductForm.tsx`**

- Na criacao (INSERT): incluir `original_name`, `original_description`, `original_images` e `original_saved_at` no `productData`
- Na atualizacao (UPDATE): NAO incluir campos `original_*` (ja estao protegidos pois nao sao adicionados ao objeto de update)

---

### 3. Proteger Campos na Edge Function de Cadastro

**Arquivo: `supabase/functions/api-produtos-cadastrar/index.ts`**

- Adicionar `original_name: nome`, `original_description: descricao`, `original_images: normalizedImagens`, `original_saved_at: new Date().toISOString()` no objeto `productData`

---

### 4. Componente de Comparacao

**Novo arquivo: `src/components/admin/ProductComparisonView.tsx`**

Componente com Tabs (Nome, Descricao, Fotos) mostrando lado a lado:
- Coluna esquerda: dados originais
- Coluna direita: dados atuais (otimizados)
- Badge "Alterado" quando houver diferenca
- Badge "Modificado" no header quando qualquer campo foi alterado

---

### 5. Botao de Restauracao

**Novo arquivo: `src/components/admin/RestoreOriginalButton.tsx`**

- Botao "Restaurar Original" com AlertDialog de confirmacao
- Ao confirmar, faz UPDATE via Supabase client copiando `original_*` de volta para `name`, `description`, `images`
- Recarrega o formulario apos restauracao

---

### 6. Integrar na Pagina de Edicao

**Arquivo: `src/pages/admin/Products.tsx`** (ou no ProductForm)

- Quando editando um produto (`product?.id` existe), renderizar `ProductComparisonView` e `RestoreOriginalButton` abaixo do formulario
- Passar os dados do produto com campos `original_*`

---

### Secao Tecnica

**Arquivos criados:**
1. Nova migracao SQL (colunas + dados + indice)
2. `src/components/admin/ProductComparisonView.tsx`
3. `src/components/admin/RestoreOriginalButton.tsx`

**Arquivos modificados:**
1. `src/components/admin/ProductForm.tsx` - salvar `original_*` na criacao
2. `supabase/functions/api-produtos-cadastrar/index.ts` - salvar `original_*` na criacao via API

**Regra de negocio:**
- `original_*` sao salvos UMA VEZ na criacao e NUNCA sobrescritos em updates
- Restauracao copia `original_*` de volta para os campos editaveis (`name`, `description`, `images`)
- Os campos `original_*` em si nunca sao alterados (nem na restauracao)
