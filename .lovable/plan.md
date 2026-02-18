
# Normalizar Formato de Atributos em Todos os Pontos de Entrada

## Problema
Os endpoints de **atualizar atributo** (`PUT /products/:id/attributes` e `api-produtos-atributos`) ja usam o formato ML correto (`value_name` + `values`), mas os endpoints de **criacao** de produto simplesmente armazenam os atributos como foram enviados, sem normalizar. Isso faz com que atributos criados pelo cadastro fiquem no formato antigo `{ id, name, value }`.

## Pontos afetados

1. **`supabase/functions/products/index.ts`** - `handleCreateProduct` (linha 222): passa `attrs` direto sem transformar
2. **`supabase/functions/api-produtos-cadastrar/index.ts`** (linha 307): passa `normalizedAtributos` direto
3. **Funcao SQL `add_product_attribute`**: constroi atributo com `value` em vez de `value_name`
4. **Funcao SQL `migrate_specifications_to_attributes`**: usa formato antigo

## Alteracoes

### 1. Funcao auxiliar de normalizacao (em ambas Edge Functions)

Criar uma funcao `normalizeAttributes` que transforma qualquer array de atributos para o formato ML:

```text
Entrada aceita:
  { id, name, value, value_id? }        (formato antigo)
  { id, name, value_name, value_id? }   (formato novo sem values)
  { id, name, value_name, values, ... } (formato completo)

Saida sempre:
  { id, name, value_id, value_name, values: [{ id, name }] }
```

### 2. `supabase/functions/products/index.ts`
- Adicionar funcao `normalizeAttributes(attrs)` antes do `handleCreateProduct`
- Na linha 222, trocar `attributes: attrs` por `attributes: normalizeAttributes(attrs)`

### 3. `supabase/functions/api-produtos-cadastrar/index.ts`
- Adicionar a mesma funcao `normalizeAttributes`
- Na linha 307, trocar `attributes: normalizedAtributos` por `attributes: normalizeAttributes(normalizedAtributos)`

### 4. Funcao SQL `add_product_attribute`
- Alterar via migracao para usar `value_name` e `values` array:
```text
De: jsonb_build_object('id', p_attribute_id, 'name', attr_def.name, 'value', p_value, 'value_id', p_value_id)
Para: jsonb_build_object('id', p_attribute_id, 'name', attr_def.name, 'value_name', p_value, 'value_id', p_value_id, 'values', jsonb_build_array(jsonb_build_object('id', p_value_id, 'name', p_value)))
```

### 5. Funcao SQL `migrate_specifications_to_attributes`
- Mesma alteracao: trocar `'value'` por `'value_name'` e adicionar campo `values`

### Resultado
- Qualquer atributo criado por qualquer endpoint sera sempre armazenado no formato ML
- Retrocompatibilidade mantida: aceita tanto `value` quanto `value_name` na entrada
- Funcoes SQL de banco tambem passam a usar o formato correto

### Arquivos modificados
- `supabase/functions/products/index.ts`
- `supabase/functions/api-produtos-cadastrar/index.ts`
- Nova migracao SQL para `add_product_attribute` e `migrate_specifications_to_attributes`
