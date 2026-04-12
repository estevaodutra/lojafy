

# Fluxo de Aprovação de Cancelamento pelo Super Admin

## Problema
Atualmente, o `CancelOrderModal` cancela o pedido e credita a carteira imediatamente. Qualquer usuário com acesso (reseller, supplier, admin) pode executar o cancelamento diretamente. O correto é que todos os usuários apenas **solicitem** o cancelamento, e o **super_admin aprove** (momento em que o valor é creditado).

## Mudanças

### 1. `CancelOrderModal.tsx` - Transformar em solicitação
- Para **todos os usuários** (inclusive admin/supplier): ao invés de setar `status: 'cancelado'`, setar `status: 'cancelamento_solicitado'`
- Gravar `cancelamento_motivo`, `cancelamento_observacao`, `cancelamento_solicitado_em`, `cancelamento_solicitado_por`
- Remover a chamada a `creditar_carteira` deste modal
- Atualizar textos: "Solicitar Cancelamento" em vez de "Confirmar Cancelamento"
- Exceção: `super_admin` pode aprovar diretamente (cancelar + creditar) via botão separado

### 2. `RequestCancelModal.tsx` - Mantém como está
Já faz solicitação para pedidos `enviado`. Sem mudança.

### 3. `RequestReturnModal.tsx` - Mantém como está  
Já é uma solicitação. Sem mudança.

### 4. `OrderActionBar.tsx` - Ajustar lógica de botões
- Para reseller/supplier/admin: botão "Cancelar" vira "Solicitar Cancelamento" (usa o mesmo `CancelOrderModal` refatorado)
- O botão "Solicitar Cancelamento" (para `enviado`) permanece como está

### 5. Nova aba "Solicitações" na página `AdminOrders.tsx`
- Adicionar `Tabs` (Todos os Pedidos | Solicitações)
- Aba "Solicitações" lista pedidos com status `cancelamento_solicitado`, `devolucao_andamento`, `devolucao_analise`
- Cada item mostra: número do pedido, cliente, motivo, data da solicitação, valor
- Botões de ação: **Aprovar** (cancela + credita carteira) e **Recusar** (volta ao status anterior)

### 6. Novo componente `OrderSolicitations.tsx`
- Query pedidos com status de solicitação
- Para cada solicitação, mostrar card com dados e ações
- Botão "Aprovar Cancelamento":
  - Atualiza status para `cancelado`
  - Chama `creditar_carteira` com o valor total
  - Insere histórico
- Botão "Recusar":
  - Volta status para o anterior (guardado no histórico ou inferido)
  - Insere histórico com nota de recusa

### 7. `handleMarkFraud` no `OrderActionBar.tsx`
- Manter como está (super_admin pode cancelar diretamente por fraude e creditar)

## Arquivos

| Arquivo | Ação |
|---------|------|
| `src/components/order-details/CancelOrderModal.tsx` | Refatorar: solicitar em vez de cancelar diretamente |
| `src/components/order-details/OrderActionBar.tsx` | Ajustar labels dos botões |
| `src/pages/admin/Orders.tsx` | Adicionar Tabs com aba "Solicitações" |
| `src/components/admin/OrderSolicitations.tsx` | Criar: lista de solicitações pendentes com aprovação/recusa |

## Fluxo resumido

```text
Usuário clica "Solicitar Cancelamento"
  → status = cancelamento_solicitado
  → Aparece na aba "Solicitações" do super admin
  
Super Admin aprova
  → status = cancelado
  → creditar_carteira(valor)
  → Notificação ao cliente

Super Admin recusa
  → status volta ao anterior
  → Notificação ao cliente
```

