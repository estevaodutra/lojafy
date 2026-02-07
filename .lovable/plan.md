

# Retornar Todas as Informacoes do Produto no Endpoint Unpublished

## Resumo

Alterar o endpoint `GET /products/unpublished` para retornar **todos os campos** da tabela `products` em vez de apenas campos selecionados.

## Alteracao

### Edge Function (`supabase/functions/lojafy-integra/index.ts`)

**Linha 270** - Trocar o `.select(...)` com campos especificos por `select('*')`:

**Antes:**
```typescript
.select('id, name, description, price, sku, gtin_ean13, main_image_url, brand, stock_quantity, category_id')
```

**Depois:**
```typescript
.select('*')
```

Isso fara com que o endpoint retorne todos os campos da tabela `products`, incluindo campos como `weight`, `height`, `width`, `length`, `additional_images`, `active`, `created_at`, `updated_at`, e quaisquer outros campos que existam ou venham a ser adicionados no futuro.

### Arquivos Modificados

1. **`supabase/functions/lojafy-integra/index.ts`** - Alterar 1 linha (linha 270)

