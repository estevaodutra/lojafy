

# Atualizar Status de Pedidos - Plano de Implementacao

## Resumo

Adicionar 4 novos status de pedido (recebido, embalado, enviado, em_reposicao, em_falta), renomear "despachado" para "enviado", implementar acoes rapidas no painel do fornecedor com modais especiais, notificacoes automaticas e indisponibilizacao de produtos em falta.

## Decisao Arquitetural: Status Interno

O banco de dados atualmente usa status em ingles (pending, processing, shipped, etc.) com mapeamento PT/EN na edge function da API. Os novos status nao tem equivalente em ingles natural, entao **os novos status serao armazenados diretamente em portugues** no banco (ex: `recebido`, `embalado`, `enviado`, `em_reposicao`, `em_falta`). Os status antigos serao migrados:

- `shipped` -> `enviado`
- `processing` -> `em_preparacao`
- `pending` -> `pendente`
- `delivered` -> `finalizado`
- `cancelled` -> `cancelado`
- `refunded` -> `reembolsado`

Isso elimina a camada de traducao EN/PT e padroniza tudo em portugues.

---

## Fase 1: Banco de Dados

### 1.1 Migracao SQL

```sql
-- 1. Migrar dados existentes de EN para PT
UPDATE orders SET status = 'pendente' WHERE status = 'pending';
UPDATE orders SET status = 'em_preparacao' WHERE status = 'processing';
UPDATE orders SET status = 'enviado' WHERE status = 'shipped';
UPDATE orders SET status = 'finalizado' WHERE status = 'delivered';
UPDATE orders SET status = 'cancelado' WHERE status = 'cancelled';
UPDATE orders SET status = 'reembolsado' WHERE status = 'refunded';

-- 2. Migrar historico
UPDATE order_status_history SET status = 'pendente' WHERE status = 'pending';
UPDATE order_status_history SET status = 'em_preparacao' WHERE status = 'processing';
UPDATE order_status_history SET status = 'enviado' WHERE status = 'shipped';
UPDATE order_status_history SET status = 'finalizado' WHERE status = 'delivered';
UPDATE order_status_history SET status = 'cancelado' WHERE status = 'cancelled';
UPDATE order_status_history SET status = 'reembolsado' WHERE status = 'refunded';

-- 3. Remover constraint antiga e criar nova
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (
  status = ANY (ARRAY[
    'pendente', 'recebido', 'em_preparacao', 'embalado',
    'enviado', 'em_reposicao', 'em_falta',
    'finalizado', 'cancelado', 'reembolsado'
  ])
);

-- 4. Adicionar coluna para previsao de envio (usado no status em_reposicao)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_shipping_date date;

-- 5. Adicionar coluna para motivo (usado em em_falta/cancelado)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_reason text;
```

### 1.2 Migrar dados em producao (Live)

Antes de publicar, sera necessario executar os UPDATEs de dados no ambiente Live via Cloud View > Run SQL.

---

## Fase 2: Arquivo Centralizado de Configuracao de Status

### 2.1 Criar `src/constants/orderStatus.ts`

Arquivo centralizado com toda a configuracao de status, eliminando duplicacao em ~10 arquivos:

```typescript
export const ORDER_STATUS_CONFIG = {
  pendente: { label: 'Pendente', icon: Clock, color: 'bg-gray-100 text-gray-800', variant: 'secondary' },
  recebido: { label: 'Recebido', icon: Inbox, color: 'bg-blue-100 text-blue-800', variant: 'default' },
  em_preparacao: { label: 'Em Preparacao', icon: Settings, color: 'bg-yellow-100 text-yellow-800', variant: 'outline' },
  embalado: { label: 'Embalado', icon: Package, color: 'bg-orange-100 text-orange-800', variant: 'default' },
  enviado: { label: 'Enviado', icon: Send, color: 'bg-purple-100 text-purple-800', variant: 'secondary' },
  em_reposicao: { label: 'Em Reposicao', icon: AlertTriangle, color: 'bg-amber-100 text-amber-800', variant: 'warning' },
  em_falta: { label: 'Em Falta', icon: XCircle, color: 'bg-red-100 text-red-800', variant: 'destructive' },
  finalizado: { label: 'Finalizado', icon: CheckCircle, color: 'bg-green-100 text-green-800', variant: 'default' },
  cancelado: { label: 'Cancelado', icon: Ban, color: 'bg-gray-100 text-gray-800', variant: 'destructive' },
  reembolsado: { label: 'Reembolsado', icon: RefreshCw, color: 'bg-gray-100 text-gray-800', variant: 'secondary' },
};

export const STATUS_TRANSITIONS = {
  pendente: ['recebido', 'cancelado'],
  recebido: ['em_preparacao', 'em_falta', 'cancelado'],
  em_preparacao: ['embalado', 'em_reposicao', 'em_falta', 'cancelado'],
  embalado: ['enviado', 'em_reposicao', 'cancelado'],
  enviado: ['finalizado', 'cancelado'],
  em_reposicao: ['em_preparacao', 'embalado', 'enviado', 'cancelado'],
  em_falta: ['cancelado', 'reembolsado'],
  finalizado: ['reembolsado'],
  cancelado: ['reembolsado'],
  reembolsado: [],
};

// Status visiveis por papel para selecao
export const SUPPLIER_STATUSES = ['recebido','em_preparacao','embalado','enviado','em_reposicao','em_falta'];
export const ADMIN_STATUSES = Object.keys(ORDER_STATUS_CONFIG);
```

---

## Fase 3: Atualizar Interfaces (10 arquivos)

Todos os arquivos abaixo serao refatorados para importar de `orderStatus.ts` e usar status em portugues:

| Arquivo | Alteracoes |
|---------|-----------|
| `src/pages/admin/Orders.tsx` | Status config, filtros, select de alteracao (todos os status para admin) |
| `src/pages/supplier/OrderManagement.tsx` | Status config, filtros, adicionar botoes de acao rapida |
| `src/pages/reseller/Orders.tsx` | Status config, tabs de filtro |
| `src/pages/customer/Orders.tsx` | Status icon/label/variant |
| `src/pages/customer/Dashboard.tsx` | Status icon/label |
| `src/components/OrderDetailsModal.tsx` | Status icon/label/variant na timeline |
| `src/components/admin/OrdersManagementSection.tsx` | Status config, filtros, select |
| `src/pages/RastrearPedido.tsx` | Status badge |
| `src/components/admin/SalesSection.tsx` (se usar status) | Verificar e atualizar |

---

## Fase 4: Painel do Fornecedor - Acoes Rapidas

### 4.1 Botoes de acao rapida em `OrderManagement.tsx`

Adicionar botoes contextuais baseados no status atual do pedido, usando `STATUS_TRANSITIONS` para determinar quais acoes mostrar.

### 4.2 Criar `src/components/supplier/ReposicaoModal.tsx`

Modal para status "Em Reposicao" com:
- Campo de data (previsao de envio) - obrigatorio
- Campo de motivo - opcional
- Salva `estimated_shipping_date` e `status_reason` no pedido

### 4.3 Criar `src/components/supplier/EmFaltaModal.tsx`

Modal para status "Em Falta" com:
- Aviso de cancelamento e indisponibilizacao de produtos
- Campo de motivo - obrigatorio
- Ao confirmar:
  1. Atualiza status do pedido para `em_falta`
  2. Marca produtos do pedido como `active = false`
  3. Registra no historico
  4. Cria notificacoes

---

## Fase 5: Indisponibilizacao Automatica de Produtos

Quando pedido for marcado como `em_falta`:

1. Buscar `order_items` do pedido
2. Para cada produto, executar `UPDATE products SET active = false WHERE id = product_id`
3. Registrar no historico de status: "Produtos indisponibilizados por falta no pedido #X"
4. Criar notificacao para superadmin: "X produto(s) indisponibilizado(s) por falta"
5. Exibir toast: "Pedido marcado em falta. X produto(s) indisponibilizado(s)."

---

## Fase 6: Notificacoes

### 6.1 Funcao de notificacao no frontend

Criar funcao `createOrderStatusNotification` que ao atualizar status:

1. Cria notificacao na tabela `notifications` para o cliente (user_id do pedido)
2. Para status `em_reposicao`, `em_falta`, `cancelado`, `reembolsado`: tambem notifica o revendedor (reseller_id do pedido)

### 6.2 Mensagens

As mensagens seguem o mapeamento definido na spec do usuario, inseridas diretamente na tabela `notifications` via Supabase client.

---

## Fase 7: Edge Function da API

### 7.1 Atualizar `api-pedidos-atualizar-status/index.ts`

- Remover mapeamento PT/EN (agora tudo e PT no banco)
- Atualizar `VALID_STATUSES` com novos status
- Adicionar validacao de transicoes permitidas
- Suportar campos `previsao_envio` e `motivo` no body
- Implementar indisponibilizacao de produtos quando status = `em_falta`

---

## Fase 8: Documentacao da API

### 8.1 Atualizar `src/data/apiEndpointsData.ts`

- Novos status na lista
- Remover mapeamento interno (nao ha mais)
- Atualizar exemplos de request/response
- Documentar campos opcionais `previsao_envio` e `motivo`
- Documentar transicoes permitidas

---

## Arquivos Modificados/Criados

| Acao | Arquivo |
|------|---------|
| Criar | `src/constants/orderStatus.ts` |
| Criar | `src/components/supplier/ReposicaoModal.tsx` |
| Criar | `src/components/supplier/EmFaltaModal.tsx` |
| Criar | Migracao SQL (schema) |
| Editar | `src/pages/admin/Orders.tsx` |
| Editar | `src/pages/supplier/OrderManagement.tsx` |
| Editar | `src/pages/reseller/Orders.tsx` |
| Editar | `src/pages/customer/Orders.tsx` |
| Editar | `src/pages/customer/Dashboard.tsx` |
| Editar | `src/components/OrderDetailsModal.tsx` |
| Editar | `src/components/admin/OrdersManagementSection.tsx` |
| Editar | `src/pages/RastrearPedido.tsx` |
| Editar | `supabase/functions/api-pedidos-atualizar-status/index.ts` |
| Editar | `src/data/apiEndpointsData.ts` |

## Dados a Migrar no Live

Antes de publicar, executar no Cloud View > Run SQL (com Live selecionado):

```sql
UPDATE orders SET status = 'pendente' WHERE status = 'pending';
UPDATE orders SET status = 'em_preparacao' WHERE status = 'processing';
UPDATE orders SET status = 'enviado' WHERE status = 'shipped';
UPDATE orders SET status = 'finalizado' WHERE status = 'delivered';
UPDATE orders SET status = 'cancelado' WHERE status = 'cancelled';
UPDATE orders SET status = 'reembolsado' WHERE status = 'refunded';

UPDATE order_status_history SET status = 'pendente' WHERE status = 'pending';
UPDATE order_status_history SET status = 'em_preparacao' WHERE status = 'processing';
UPDATE order_status_history SET status = 'enviado' WHERE status = 'shipped';
UPDATE order_status_history SET status = 'finalizado' WHERE status = 'delivered';
UPDATE order_status_history SET status = 'cancelado' WHERE status = 'cancelled';
UPDATE order_status_history SET status = 'reembolsado' WHERE status = 'refunded';
```

## Observacao sobre Escopo

Devido ao tamanho desta mudanca (~15 arquivos + banco + edge function), a implementacao sera feita em etapas dentro de uma unica execucao, priorizando: banco -> constantes -> interfaces -> fornecedor -> notificacoes -> API.

