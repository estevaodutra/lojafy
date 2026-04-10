

# Refatorar Status de Pedidos conforme Nova Documentacao

## Resumo
Migrar os 15 status atuais para os 15 novos status definidos na documentacao, incluindo migracao SQL de dados existentes, atualizacao do frontend e edge functions.

## Mapeamento de Status

```text
REMOVIDOS (atual → novo):
  em_preparacao    → recebido (42 pedidos existentes)
  devolucao_solicitada → devolucao_andamento
  em_devolucao     → devolucao_recebida
  troca_solicitada → (remover, 0 pedidos)
  em_troca         → (remover, 0 pedidos)

ADICIONADOS:
  cancelamento_solicitado
  devolucao_andamento
  devolucao_recebida
  devolucao_analise
  devolucao_aprovada
```

Dados existentes: 42 pedidos com `em_preparacao` serao migrados para `recebido`. Nenhum pedido usa `devolucao_solicitada`, `em_devolucao`, `troca_solicitada` ou `em_troca`.

---

## 1. Migracao SQL

- Migrar pedidos `em_preparacao` → `recebido`
- Migrar `order_status_history` com os mesmos mapeamentos
- Adicionar novos campos na tabela `orders`: `motivo_atraso`, `motivo_falta`, `cancelamento_solicitado_em`, `cancelamento_solicitado_por`, `cancelado_em`, `devolucao_iniciada_em`, `devolucao_recebida_em`, `devolucao_analisada_em`, `devolucao_aprovada_em`, `valor_reembolso`, `reembolso_parcial`, `observacao_aprovacao`, `reembolsado_em`, `credito_carteira_id`, `observacao_interna`
- Remover constraint antiga de status e criar nova com os 15 status corretos
- Atualizar triggers de notificacao se referenciam status antigos

## 2. Frontend — `src/constants/orderStatus.ts`

Reescrever completamente com:
- Novo `OrderStatus` type com 15 status da documentacao
- Novo `ORDER_STATUS_CONFIG` com labels/emojis conforme doc
- Novo `STATUS_TRANSITIONS` conforme regras de transicao da doc
- Novo `SUPPLIER_QUICK_ACTIONS` sem `em_preparacao`, sem troca, com novos fluxos de devolucao
- Remover `EXCHANGE_REASONS` (troca removida)
- Adicionar motivos de cancelamento: `cliente_recusou_atraso`, `solicitacao_revendedor`, `devolucao_negada`
- Atualizar `SUPPLIER_STATUSES`, `RESELLER_NOTIFY_STATUSES`

## 3. Frontend — Paginas afetadas

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/reseller/Orders.tsx` | Atualizar `visibleTabs` com novos status |
| `src/pages/supplier/OrderManagement.tsx` | Remover refs a `em_preparacao`, `troca_*`; ajustar quick actions |
| `src/pages/customer/Orders.tsx` | Sem mudanca funcional (usa helper functions) |
| `src/data/apiEndpointsData.ts` | Atualizar documentacao de status e transicoes |
| `src/components/supplier/TrocaModal.tsx` | Remover (nao mais necessario) |

## 4. Edge Functions

| Funcao | Mudanca |
|--------|---------|
| `api-pedidos-atualizar-status` | Atualizar `VALID_STATUSES` com novos 15, remover troca, ajustar validacoes |
| `api-pedidos-listar` | Verificar se referencia status antigos |
| `webhook-n8n-payment` | Sem mudanca (usa `recebido`) |
| `dispatch-order-webhook` | Sem mudanca |
| `check-pending-payments` | Sem mudanca |

## 5. Componentes Supplier

| Componente | Mudanca |
|------------|---------|
| `DevolucaoModal.tsx` | Manter, agora dispara `devolucao_andamento` |
| `TrocaModal.tsx` | Remover |
| `ReposicaoModal.tsx` | Manter, adicionar campo `motivo_atraso` obrigatorio |
| `EmFaltaModal.tsx` | Manter |
| `CancelamentoModal.tsx` | Manter, adicionar novos motivos |

