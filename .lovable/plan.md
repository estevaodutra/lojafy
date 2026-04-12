

# Adicionar Barra de Ações no Modal de Detalhes do Pedido

## Resumo
Adicionar uma barra de ações contextual logo abaixo do header do `OrderDetailsModal`, com botões condicionais baseados no status do pedido e no papel do usuário. Inclui modais para cancelamento, devolução, atualização de status, observação e rastreio, além de uma seção de tickets relacionados.

## Arquivos a criar/editar

| Arquivo | Acao |
|---------|------|
| `src/components/order-details/OrderActionBar.tsx` | **Criar**: barra de ações com botões condicionais e dropdown "Mais" |
| `src/components/order-details/CancelOrderModal.tsx` | **Criar**: modal cancelamento (reusa `CANCELLATION_REASONS`) com info de reembolso |
| `src/components/order-details/RequestCancelModal.tsx` | **Criar**: modal "Solicitar Cancelamento" para pedidos enviados (checkbox de ciencia) |
| `src/components/order-details/RequestReturnModal.tsx` | **Criar**: modal devolução (reusa `RETURN_REASONS`) com upload de fotos |
| `src/components/order-details/UpdateStatusModal.tsx` | **Criar**: modal atualizar status para admin/fornecedor com campos dinâmicos por status |
| `src/components/order-details/AddNoteModal.tsx` | **Criar**: modal observação (interna ou para cliente) |
| `src/components/order-details/UpdateTrackingModal.tsx` | **Criar**: modal atualizar rastreio |
| `src/components/order-details/RelatedTickets.tsx` | **Criar**: seção de tickets relacionados ao pedido |
| `src/components/OrderDetailsModal.tsx` | **Editar**: integrar `OrderActionBar` abaixo do header e `RelatedTickets` antes do histórico |

## Detalhes

### 1. OrderActionBar.tsx
- Props: `order`, `userRole`, `onRefresh` (callback para recarregar dados do pedido)
- Botoes visíveis:
  - **Abrir Ticket**: sempre (reusa `OpenTicketButton` existente)
  - **Cancelar Pedido**: se status in `['pendente','pago','recebido','embalado','em_reposicao']` e role admin/fornecedor/revendedor
  - **Solicitar Cancelamento**: se status = `enviado` e role revendedor/admin
  - **Solicitar Devolução**: se status = `finalizado` e role revendedor/admin
- Dropdown "Mais Ações" (DropdownMenu do shadcn):
  - Copiar Número do Pedido (`navigator.clipboard`)
  - Adicionar Observação (admin/fornecedor)
  - Atualizar Rastreio (admin/fornecedor)
  - Atualizar Status (admin/fornecedor, usa `STATUS_TRANSITIONS`)
  - Separador + Marcar como Fraude (só super_admin, seta motivo `fraude` e cancela)

### 2. CancelOrderModal.tsx
- Reusa `CANCELLATION_REASONS` e `REASONS_REQUIRING_OBSERVATION` de `orderStatus.ts`
- Mostra valor do reembolso (total_amount)
- Alerta de ação irreversível
- Ao confirmar: atualiza order status para `cancelado` com motivo, insere histórico, credita carteira via `creditar_carteira` RPC

### 3. RequestCancelModal.tsx
- Para pedidos com status `enviado`
- Checkbox obrigatório de ciência
- Campo motivo obrigatório
- Ao confirmar: atualiza status para `cancelamento_solicitado`

### 4. RequestReturnModal.tsx
- Reusa `RETURN_REASONS` de `orderStatus.ts`
- Campo descrição obrigatório
- Upload de fotos opcional
- Ao confirmar: atualiza status para `devolucao_andamento` com motivo e observação

### 5. UpdateStatusModal.tsx
- Select com transições válidas via `STATUS_TRANSITIONS[currentStatus]`
- Campos dinâmicos:
  - `em_reposicao`: previsão envio (datepicker) + motivo atraso
  - `em_falta`: motivo
  - `cancelado`: motivo cancelamento + observação condicional
  - `devolucao_andamento`: motivo devolução
- Reusa lógica de `updateOrderStatus` do `SupplierOrderManagement`

### 6. AddNoteModal.tsx
- Radio: interna vs para cliente
- Textarea obrigatório
- Insere em `order_status_history` com notes

### 7. UpdateTrackingModal.tsx
- Mostra rastreio atual
- Input novo código
- Checkbox "Notificar cliente"
- Atualiza `tracking_number` na tabela `orders`

### 8. RelatedTickets.tsx
- Query `order_tickets` filtrado por `order_id`
- Card por ticket: número, tipo, status badge, data, botão "Ver Ticket"
- Link para abrir ticket se nenhum existir

### 9. OrderDetailsModal.tsx
- Inserir `<OrderActionBar>` entre o `DialogHeader` e o conteúdo (linha ~619)
- Inserir `<RelatedTickets>` antes da seção de histórico (linha ~1263)
- Passar `order`, `profile`, e callback `fetchOrderDetails` como props

## Sem migração SQL necessária
As tabelas `order_tickets`, `orders`, `order_status_history` já existem com todas as colunas necessárias. As stored procedures `creditar_carteira` e `debitar_carteira` já existem para reembolsos.

