

# Alterar Formato de Atributos para Padrao Mercado Livre

## Problema
O formato atual dos atributos armazenados no produto e:
```json
{ "id": "BRAND", "name": "Marca", "value": "Nobelium", "value_id": "59134419" }
```

O Mercado Livre usa um formato diferente com `value_name` e um array `values`:
```json
{
  "id": "BRAND",
  "name": "Marca",
  "value_id": "59134419",
  "value_name": "Nobelium",
  "values": [{ "id": "59134419", "name": "Nobelium" }]
}
```

## Alteracoes

### 1. `supabase/functions/products/index.ts` (handler `handleUpdateAttribute`)
Alterar a montagem do `newAttribute` (linhas 445-450) de:
```
{ id, name, value, value_id }
```
Para:
```
{ id, name, value_id, value_name, values: [{ id: value_id, name: value_name }] }
```
- `value_name` vem do campo `value` do body (renomear semanticamente)
- `value_id` vem do campo `value_id` do body
- `values` e um array com um objeto contendo `id` e `name`
- Aceitar tambem `value_name` diretamente no body como alternativa a `value`

### 2. `supabase/functions/api-produtos-atributos/index.ts`
Mesma alteracao na montagem do `newAttribute` (linhas 144-149):
- Trocar `value` por `value_name`
- Adicionar array `values`

### 3. `src/data/apiEndpointsData.ts`
Atualizar os exemplos de request body e response dos endpoints de atributos para refletir o novo formato:
- Trocar `value: "Plastico ABS"` por `value_name: "Plastico ABS"`
- Adicionar `values` nos exemplos de resposta

### 4. Validacao no body
- O campo obrigatorio passa de `value` para `value_name` (aceitar ambos para retrocompatibilidade)
- `value_id` continua opcional

## Detalhes tecnicos

### Novo formato do atributo armazenado
```json
{
  "id": "BRAND",
  "name": "Marca",
  "value_id": "59134419",
  "value_name": "Nobelium",
  "values": [
    { "id": "59134419", "name": "Nobelium" }
  ]
}
```

### Retrocompatibilidade
- Se o body enviar `value` em vez de `value_name`, aceitar como alias
- Se `value_id` for null, o array `values` tera `id` como null

### Arquivos modificados
- `supabase/functions/products/index.ts`
- `supabase/functions/api-produtos-atributos/index.ts`
- `src/data/apiEndpointsData.ts`
