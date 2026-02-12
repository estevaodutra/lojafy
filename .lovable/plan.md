
# Corrigir Dropdown "Status de Envio" que Reverte ao Valor Anterior

## Problema Identificado

O dropdown de "Status de Envio" na pagina de pedidos (`/super-admin/pedidos`) mostra os 10 status validos, mas ao selecionar um novo status, ele reverte para o valor anterior.

## Causa Raiz

Na funcao `updateOrderStatus` em `src/pages/admin/Orders.tsx` (linha 151), a atualizacao do estado local usa uma referencia "stale" (desatualizada) do array `orders`:

```text
setOrders(orders.map(order => 
  order.id === orderId ? { ...order, status: newStatus } : order
));
```

O `orders` capturado no closure pode estar desatualizado se o componente re-renderizou entre o clique e a resposta do Supabase. Isso faz com que o `setOrders` sobrescreva o estado atual com uma versao antiga, revertendo a mudanca.

Alem disso, a insercao no `order_status_history` pode estar falhando silenciosamente por falta de politica RLS de INSERT para admins/super_admins nessa tabela.

## Alteracoes

### 1. `src/pages/admin/Orders.tsx` - Corrigir atualizacao de estado

- Trocar `setOrders(orders.map(...))` por `setOrders(prev => prev.map(...))` (functional update)
- Adicionar tratamento de erro na insercao do historico de status
- Aplicar atualizacao otimista: atualizar a UI imediatamente e reverter se a operacao falhar

### 2. Politica RLS para `order_status_history`

Adicionar politica de INSERT para admins/super_admins na tabela `order_status_history`, que atualmente so tem politica de SELECT. Sem essa politica, o registro de historico nao eh salvo.

## Detalhes Tecnicos

### Correcao do estado (principal)

```text
// ANTES (bugado - closure stale):
setOrders(orders.map(order => ...))

// DEPOIS (correto - functional update):
setOrders(prev => prev.map(order => ...))
```

### Atualizacao otimista com rollback

1. Salvar estado anterior
2. Atualizar UI imediatamente  
3. Chamar Supabase
4. Se falhar, reverter para estado anterior e mostrar toast de erro

### Politica RLS

Criar politica INSERT na tabela `order_status_history` para perfis com role `admin` ou `super_admin`.
