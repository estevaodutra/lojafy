
## Atualizar formato do body do endpoint PUT /products/{id}/attributes

### Objetivo
Alterar o endpoint para aceitar o payload no formato nativo do Mercado Livre, facilitando a integracão direta com n8n e outros sistemas.

### Formato atual (sera removido)
```json
{
  "attribute_id": "BRAND",
  "value_name": "Archy",
  "value_id": "3266931"
}
```

### Novo formato aceito
```json
{
  "id": "BRAND",
  "name": "Marca",
  "value_id": "3266931",
  "value_name": "Archy",
  "values": [
    {
      "id": "3266931",
      "name": "Archy"
    }
  ]
}
```

### Alteracoes tecnicas

**Arquivo:** `supabase/functions/products/index.ts` - funcao `handleUpdateAttribute`

1. Alterar validacao para aceitar `id` em vez de `attribute_id` (manter retrocompatibilidade aceitando ambos)
2. Usar `name` do body diretamente (se fornecido), sem precisar buscar na tabela `attribute_definitions`
3. Usar `value_name` e `value_id` do body diretamente
4. Usar `values` do body se fornecido, senao montar automaticamente
5. Remover a busca obrigatoria na tabela `attribute_definitions` (tornar opcional como fallback quando `name` nao for enviado)

### Retrocompatibilidade
- O campo `id` sera o principal, mas `attribute_id` continuara funcionando como alias
- O campo `value` continuara funcionando como alias de `value_name`
- Se `name` nao for enviado, o sistema buscara na tabela `attribute_definitions`
- Se `values` nao for enviado, sera montado automaticamente a partir de `value_id` e `value_name`

### Funcao tambem atualizada
- `api-produtos-atributos/index.ts` - mesma logica para manter consistencia entre os dois endpoints
