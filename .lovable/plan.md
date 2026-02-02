

# Plano: Criar Endpoint para Atualizar Status de Pedidos

## Visao Geral

Criar um novo endpoint `api-pedidos-atualizar-status` que permite atualizar o status de um pedido usando o numero do pedido (`order_number`) como identificador. Incluir os novos status solicitados: "recebido" e "em_preparacao".

---

## Status Disponveis

| Status | Descricao | Uso |
|--------|-----------|-----|
| `pending` | Pendente | Aguardando pagamento |
| `recebido` | Recebido | Pedido recebido/confirmado |
| `em_preparacao` | Em preparacao | Sendo preparado para envio |
| `processing` | Processando | Em processamento geral |
| `shipped` | Enviado | Despachado para entrega |
| `delivered` | Entregue | Entregue ao cliente |
| `cancelled` | Cancelado | Pedido cancelado |
| `refunded` | Reembolsado | Pagamento devolvido |

---

## Estrutura do Endpoint

### Informacoes Gerais

| Campo | Valor |
|-------|-------|
| Nome | `api-pedidos-atualizar-status` |
| Metodo | `PUT` |
| URL | `/functions/v1/api-pedidos-atualizar-status` |
| Autenticacao | API Key via header `X-API-Key` |
| Permissao | `orders.write` |

### Request Body

```json
{
  "order_number": "ORD-1769828426038_865529AC",
  "status": "shipped",
  "tracking_number": "BR123456789BR",
  "notes": "Enviado via Correios SEDEX"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| `order_number` | string | Sim | Numero do pedido |
| `status` | string | Sim | Novo status (ver lista acima) |
| `tracking_number` | string | Nao | Codigo de rastreio |
| `notes` | string | Nao | Observacao para o historico |

### Response (Sucesso)

```json
{
  "success": true,
  "message": "Status do pedido atualizado com sucesso",
  "data": {
    "order_id": "c40b90a5-bed9-4a11-bd34-358909574b57",
    "order_number": "ORD-1769828426038_865529AC",
    "previous_status": "processing",
    "new_status": "shipped",
    "tracking_number": "BR123456789BR",
    "updated_at": "2026-02-02T12:30:00Z"
  }
}
```

### Erros Possiveis

| Codigo | Motivo | Resposta |
|--------|--------|----------|
| 400 | Campos ausentes | `{ "success": false, "error": "order_number e status sao obrigatorios" }` |
| 400 | Status invalido | `{ "success": false, "error": "Status invalido. Use: pending, recebido, em_preparacao, processing, shipped, delivered, cancelled, refunded" }` |
| 401 | API Key invalida | `{ "success": false, "error": "API Key invalida ou inativa" }` |
| 403 | Sem permissao | `{ "success": false, "error": "Permissao orders.write nao concedida" }` |
| 404 | Pedido nao encontrado | `{ "success": false, "error": "Pedido nao encontrado" }` |

---

## Fluxo de Execucao

```text
1. Validar API Key (header X-API-Key)
       |
2. Verificar permissao orders.write
       |
3. Validar campos obrigatorios (order_number, status)
       |
4. Validar status permitido (8 opcoes)
       |
5. Buscar pedido por order_number
       |
6. Atualizar status + tracking_number na tabela orders
       |
7. Registrar no order_status_history (com notes)
       |
8. Retornar sucesso com dados atualizados
```

---

## Arquivos a Criar/Modificar

### 1. Nova Edge Function

Criar: `supabase/functions/api-pedidos-atualizar-status/index.ts`

Conteudo principal:
- Validacao de API Key e permissoes (orders.write)
- Lista de status validos incluindo `recebido` e `em_preparacao`
- Busca pedido por `order_number`
- Update em `orders` (status, tracking_number, updated_at)
- Insert em `order_status_history` (status, notes, created_by)
- Response com dados do pedido atualizado

### 2. Atualizar Configuracao

Modificar: `supabase/config.toml`

Adicionar:
```toml
[functions.api-pedidos-atualizar-status]
verify_jwt = false
```

### 3. Atualizar Documentacao

Modificar: `src/data/apiEndpointsData.ts`

Adicionar novo endpoint na categoria `ordersEndpoints` com:
- Titulo: "Atualizar Status do Pedido"
- Metodo: PUT
- Headers com X-API-Key
- Request body de exemplo
- Response de sucesso
- Exemplos de erro

---

## Resumo de Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `supabase/functions/api-pedidos-atualizar-status/index.ts` |
| Modificar | `supabase/config.toml` |
| Modificar | `src/data/apiEndpointsData.ts` |

