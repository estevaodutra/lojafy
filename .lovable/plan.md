

# Atualizar Documentacao dos Endpoints Legados para Formato Mercado Livre

## Problema
Os endpoints REST (`/products`) ja foram atualizados para o novo formato de atributos, mas os endpoints legados (`api-produtos-*`) ainda mostram o formato antigo com `value` em vez de `value_name` + `values`.

## Alteracoes em `src/data/apiEndpointsData.ts`

### 1. Endpoint "Cadastrar Produto" (api-produtos-cadastrar)
**Request body** (linhas 62-65) - atualizar `atributos`:
```
De: { id: 'BRAND', name: 'Marca', value: 'Generic' }
Para: { id: 'BRAND', name: 'Marca', value_name: 'Generic', values: [{ id: null, name: 'Generic' }] }
```
Mesmo para os outros atributos do array (VOLTAGE, POWER).

**Response** (linha 80) - atualizar `atributos`:
```
De: { id: 'BRAND', name: 'Marca', value: 'Generic' }
Para: { id: 'BRAND', name: 'Marca', value_name: 'Generic', values: [{ id: null, name: 'Generic' }] }
```

### 2. Endpoint "Listar Produtos" (api-produtos-listar)
**Response** (linha 108) - atualizar `atributos`:
```
De: { id: 'BRAND', name: 'Marca', value: 'Generic' }
Para: { id: 'BRAND', name: 'Marca', value_name: 'Generic', values: [{ id: null, name: 'Generic' }] }
```

### 3. Endpoint "Gerenciar Atributos" (api-produtos-atributos)
**Request body** (linhas 137-141):
```
De: { value: 'Plastico ABS', value_id: null }
Para: { value_name: 'Plastico ABS', value_id: null }
```

**Response** (linhas 149-152) - atualizar array `atributos`:
```
De: { id: 'BRAND', name: 'Marca', value: 'Generic' }
Para: { id: 'BRAND', name: 'Marca', value_name: 'Generic', values: [{ id: null, name: 'Generic' }] }

De: { id: 'MATERIAL', name: 'Material', value: 'Plastico ABS' }
Para: { id: 'MATERIAL', name: 'Material', value_name: 'Plastico ABS', values: [{ id: null, name: 'Plastico ABS' }] }
```

### Resumo
Todos os exemplos de atributos na documentacao passam a usar `value_name` + array `values` consistentemente, alinhados com o formato Mercado Livre e com as Edge Functions ja atualizadas.

