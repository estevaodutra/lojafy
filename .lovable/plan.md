
## Atualizar documentacao da API para novo formato de atributos

### Objetivo
Atualizar os exemplos de request body nos dois endpoints de atributos para refletir o novo formato nativo do Mercado Livre, com retrocompatibilidade documentada.

### Alteracoes no arquivo `src/data/apiEndpointsData.ts`

**1. Endpoint `api-produtos-atributos` (linha ~132-155)**
- Atualizar `description`: remover "Valida o atributo contra attribute_definitions" e mencionar formato Mercado Livre
- Atualizar `requestBody` de:
```json
{ "product_id": "uuid", "attribute_id": "MATERIAL", "value_name": "Plastico ABS", "value_id": null }
```
Para:
```json
{
  "product_id": "uuid-do-produto",
  "id": "MATERIAL",
  "name": "Material",
  "value_id": null,
  "value_name": "Plastico ABS",
  "values": [{ "id": null, "name": "Plastico ABS" }]
}
```

**2. Endpoint `products/:id/attributes` (linha ~1547-1555)**
- Atualizar `description`: mencionar formato Mercado Livre e retrocompatibilidade
- Atualizar `requestBody` de:
```json
{ "attribute_id": "MATERIAL", "value_name": "Plastico ABS", "value_id": "12345" }
```
Para:
```json
{
  "id": "MATERIAL",
  "name": "Material",
  "value_id": "12345",
  "value_name": "Plastico ABS",
  "values": [{ "id": "12345", "name": "Plastico ABS" }]
}
```

### Notas
- Os campos `name` e `values` serao documentados como opcionais (gerados automaticamente se omitidos)
- Sera mencionado que `attribute_id` e `value` continuam funcionando como alias para retrocompatibilidade
