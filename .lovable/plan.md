

# Corrigir Documentacao e Logica do Webhook de Pagamento

## Problema

A documentacao e o plano anterior confundem dois conceitos distintos:

- **payment_status** (ingles): status do pagamento (pending, paid, failed, expired) - eh o que este webhook atualiza
- **status** (portugues): status do pedido (pendente, recebido, cancelado, etc.) - NAO deve ser alterado diretamente por este webhook

Alem disso, o campo principal para localizar o pedido eh `paymentId` (busca por `orders.payment_id`), nao `external_reference` (que eh apenas fallback).

## Alteracoes

### 1. `src/data/apiEndpointsData.ts` - Corrigir documentacao

Atualizar o endpoint de pagamentos para refletir a realidade:

- **Campo principal**: `paymentId` (obrigatorio) - usado para localizar o pedido via `orders.payment_id`
- **Campo secundario**: `external_reference` (opcional) - fallback caso nao encontre por paymentId
- **Descricao**: Deixar claro que atualiza o `payment_status` (ingles), nao o `status` do pedido
- **Mapeamento de status**: Corrigir para mostrar apenas o mapeamento do payment_status

Mapeamento correto:

| Status Recebido | payment_status (atualizado) |
|-----------------|---------------------------|
| approved        | paid                      |
| pending         | pending                   |
| in_process      | pending                   |
| rejected        | failed                    |
| cancelled       | failed                    |

- **Response exemplo**: Corrigir para mostrar payment_status anterior/novo em vez de status do pedido
- **Campos obrigatorios**: `paymentId` e `status` (conforme validacao real do codigo)

### 2. `supabase/functions/webhook-n8n-payment/index.ts` - Corrigir logica

O switch case atual altera o campo `status` (do pedido) junto com `payment_status`. A correcao:

- **Manter** a atualizacao do `payment_status` (em ingles, como ja esta: paid, pending, failed)
- **NAO alterar** o campo `status` do pedido (remover `newStatus` do switch)
- Excecao: quando `approved`, o status do pedido pode ir para `recebido` (em portugues) pois eh a transicao logica de pagamento confirmado

Logica corrigida do switch:
```text
approved  -> payment_status = 'paid', status = 'recebido'
pending   -> payment_status = 'pending' (nao altera status do pedido)
rejected  -> payment_status = 'failed' (nao altera status do pedido)
cancelled -> payment_status = 'failed' (nao altera status do pedido)
```

O update no banco tambem precisa usar status em portugues quando alterar o campo `status`.

---

## Detalhes Tecnicos

### Validacao real do codigo (linha 43-48)
O codigo valida `paymentId` e `status` como obrigatorios, nao `external_reference`.

### Busca do pedido (linha 54-57)
Busca principal: `orders.payment_id = paymentId`
Fallback (linha 73): `orders.external_reference = external_reference` (apenas se nao encontrar pelo payment_id)

### Campos que serao atualizados no banco
- `payment_status`: paid, pending, failed (INGLES - constraint separada)
- `status`: recebido (PORTUGUES - apenas quando approved, constraint orders_status_check)
- `updated_at`: timestamp

