

# Expandir Status de Pedidos — Ciclo Completo

## Resumo

Adicionar 5 novos status (`pago`, `devolucao_solicitada`, `em_devolucao`, `troca_solicitada`, `em_troca`), 6 novos campos na tabela `orders` para motivos/observações, e atualizar toda a interface (constantes, modais, ações rápidas, edge function, notificações).

---

## 1. Migração SQL

Adicionar colunas à tabela `orders` (o campo `status` já é `text`, não é ENUM, então não precisa alterar tipo):

```sql
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancelamento_motivo TEXT,
  ADD COLUMN IF NOT EXISTS cancelamento_observacao TEXT,
  ADD COLUMN IF NOT EXISTS devolucao_motivo TEXT,
  ADD COLUMN IF NOT EXISTS devolucao_observacao TEXT,
  ADD COLUMN IF NOT EXISTS troca_motivo TEXT,
  ADD COLUMN IF NOT EXISTS troca_observacao TEXT;
```

Nota: `estimated_shipping_date` e `status_reason` já existem na tabela.

---

## 2. `src/constants/orderStatus.ts`

Atualizar completamente:

- **Tipo `OrderStatus`**: adicionar `"pago"`, `"devolucao_solicitada"`, `"em_devolucao"`, `"troca_solicitada"`, `"em_troca"`
- **`ORDER_STATUS_CONFIG`**: adicionar configs para os 5 novos status com ícones (BadgeCheck para pago, RotateCcw para devolução, ArrowLeftRight para troca, etc.)
- **`STATUS_TRANSITIONS`**: atualizar conforme o fluxo descrito (pendente→pago, pago→recebido, finalizado→devolucao_solicitada/troca_solicitada, etc.)
- **`STATUS_NOTIFICATION_MESSAGES`**: adicionar mensagens para os 5 novos status
- **`RESELLER_NOTIFY_STATUSES`**: adicionar `devolucao_solicitada`, `troca_solicitada`
- **`SUPPLIER_QUICK_ACTIONS`**: adicionar ação "Recebi o Pedido" para `pago`, e ações de pós-venda para `finalizado`
- **Novas constantes exportadas**:
  - `CANCELLATION_REASONS` — array de { code, label }
  - `RETURN_REASONS` — array de { code, label }
  - `EXCHANGE_REASONS` — array de { code, label }
  - `REASONS_REQUIRING_OBSERVATION` — códigos que exigem observação (`erro_pedido`, `outro`)

---

## 3. Novos Componentes de Modal

### `src/components/supplier/CancelamentoModal.tsx`
- Select de motivo (6 opções)
- Campo observação (obrigatório se motivo = `erro_pedido` ou `outro`)
- Aviso "ação irreversível"
- Callback `onConfirm(motivo, observacao)`

### `src/components/supplier/DevolucaoModal.tsx`
- Select de motivo (5 opções)
- Campo observação (opcional)
- Callback `onConfirm(motivo, observacao)`

### `src/components/supplier/TrocaModal.tsx`
- Select de motivo (4 opções)
- Campo observação (opcional)
- Callback `onConfirm(motivo, observacao)`

---

## 4. Atualizar Página do Fornecedor

### `src/pages/supplier/OrderManagement.tsx`
- Importar novos modais
- Adicionar states para os novos modais
- Atualizar `updateOrderStatus` para aceitar campos extras (`cancelamento_motivo`, `cancelamento_observacao`, `devolucao_motivo`, `devolucao_observacao`, `troca_motivo`, `troca_observacao`)
- Atualizar `SUPPLIER_QUICK_ACTIONS` para incluir novos status (`pago` → "Recebi o Pedido")
- Adicionar ações de pós-venda quando status = `finalizado`

---

## 5. Atualizar Painel Admin

### `src/components/admin/OrdersManagementSection.tsx`
- O select de status já usa `ALL_STATUSES` — vai pegar os novos automaticamente
- Adicionar campos de motivo/observação no dialog de edição quando status = cancelado/devolução/troca

---

## 6. Atualizar Página do Revendedor

### `src/pages/reseller/Orders.tsx`
- Adicionar `"pago"`, `"devolucao_solicitada"`, `"em_devolucao"`, `"troca_solicitada"`, `"em_troca"` ao array `visibleTabs`

---

## 7. Atualizar Edge Function

### `supabase/functions/api-pedidos-atualizar-status/index.ts`
- Adicionar 5 novos status ao `VALID_STATUSES`
- Extrair do body: `cancelamento_motivo`, `cancelamento_observacao`, `devolucao_motivo`, `devolucao_observacao`, `troca_motivo`, `troca_observacao`
- Validações:
  - `cancelado` → exigir `cancelamento_motivo`; se motivo = `erro_pedido`/`outro` → exigir `cancelamento_observacao`
  - `devolucao_solicitada` → exigir `devolucao_motivo`
  - `troca_solicitada` → exigir `troca_motivo`
- Salvar campos novos no update

---

## 8. Notificações (Triggers existentes)

Os triggers `notify_order_confirmed`, `notify_order_shipped`, `notify_order_delivered` já cobrem `recebido`, `enviado`, `finalizado`. Para os novos status, a notificação será feita via código (como já acontece no `updateOrderStatus` do fornecedor), usando as mensagens do `STATUS_NOTIFICATION_MESSAGES`.

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar 6 colunas |
| `src/constants/orderStatus.ts` | Expandir tipos, configs, transições, mensagens, motivos |
| `src/components/supplier/CancelamentoModal.tsx` | Criar |
| `src/components/supplier/DevolucaoModal.tsx` | Criar |
| `src/components/supplier/TrocaModal.tsx` | Criar |
| `src/pages/supplier/OrderManagement.tsx` | Atualizar com novos modais e ações |
| `src/components/admin/OrdersManagementSection.tsx` | Campos de motivo no dialog |
| `src/pages/reseller/Orders.tsx` | Novos tabs |
| `supabase/functions/api-pedidos-atualizar-status/index.ts` | Novos status e validações |

