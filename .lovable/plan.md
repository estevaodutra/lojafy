
## Diagnóstico
O fluxo novo de solicitação já existe no `src/components/order-details/CancelOrderModal.tsx`, mas ainda há caminhos paralelos que continuam cancelando direto:

- `src/pages/supplier/OrderManagement.tsx` ainda chama `updateOrderStatus(..., 'cancelado')`
- `src/components/supplier/CancelamentoModal.tsx` ainda é um modal de cancelamento direto
- `src/components/order-details/UpdateStatusModal.tsx` ainda permite selecionar `cancelado`
- `src/constants/orderStatus.ts` ainda expõe transições diretas para `cancelado` em vários status

Por isso o pedido ainda pode ser finalizado sem passar pela aprovação do super admin.

## O que vou ajustar
### 1. Bloquear cancelamento direto para usuários comuns
Refatorar todos os fluxos de cancelamento para que `admin`, `supplier` e `reseller` façam apenas:
- `status = 'cancelamento_solicitado'`
- salvem motivo/observação
- registrem histórico
- nunca chamem `creditar_carteira`

### 2. Remover os bypasses existentes
Editar:
- `src/pages/supplier/OrderManagement.tsx`
- `src/components/supplier/CancelamentoModal.tsx`
- `src/components/order-details/UpdateStatusModal.tsx`
- `src/constants/orderStatus.ts`

Ajustes:
- trocar ação de “Cancelar” por “Solicitar Cancelamento”
- impedir que o modal de atualização de status mostre `cancelado` para perfis não super admin
- impedir quick actions que mandam direto para `cancelado`
- manter reembolso somente na aprovação do super admin

### 3. Manter aprovação centralizada no super admin
Revisar `src/components/admin/OrderSolicitations.tsx` para garantir que:
- aprovação = muda para `cancelado` + credita carteira
- recusa = volta ao status anterior
- histórico fique claro com “solicitado”, “aprovado” e “recusado”

### 4. Ajustar UX para não confundir
Atualizar textos/botões onde ainda aparecer:
- “Cancelar Pedido”
- “Confirmar Cancelamento”

Para:
- “Solicitar Cancelamento”
- “Enviar Solicitação”

Também vou garantir que o modal informe claramente que o valor só será creditado após aprovação do super admin.

## Arquivos principais
- `src/components/order-details/CancelOrderModal.tsx`
- `src/components/order-details/UpdateStatusModal.tsx`
- `src/components/supplier/CancelamentoModal.tsx`
- `src/pages/supplier/OrderManagement.tsx`
- `src/components/admin/OrderSolicitations.tsx`
- `src/constants/orderStatus.ts`

## Resultado esperado
Depois desse ajuste:
- nenhum usuário comum conseguirá cancelar direto
- toda solicitação ficará em `cancelamento_solicitado`
- o pedido só será cancelado de fato quando o super admin aprovar
- o crédito na carteira acontecerá somente na aprovação
- a aba “Solicitações” continuará sendo o ponto central de decisão
