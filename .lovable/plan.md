
# Sistema de Tickets Vinculados a Pedidos

## Visão Geral

Implementar um sistema completo de tickets vinculados a pedidos para tratar: **reembolso**, **troca** e **cancelamento de envio**, com fluxos específicos para cada tipo e responsabilidades divididas entre Cliente, Revendedor, Fornecedor e Superadmin.

---

## Fase 1: Modelagem de Banco de Dados

### 1.1 Novas Tabelas

**Tabela: `order_tickets`**
```sql
CREATE TYPE order_ticket_type AS ENUM ('reembolso', 'troca', 'cancelamento');
CREATE TYPE order_ticket_status AS ENUM ('aberto', 'em_analise', 'aguardando_cliente', 'resolvido', 'cancelado');

CREATE TABLE order_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) NOT NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  tipo order_ticket_type NOT NULL,
  status order_ticket_status DEFAULT 'aberto',
  
  customer_id UUID NOT NULL,
  reseller_id UUID,
  supplier_id UUID,
  current_responsible UUID,
  
  reason TEXT NOT NULL,
  resolution TEXT,
  refund_amount DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  sla_first_response TIMESTAMPTZ,
  sla_resolution TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  
  CONSTRAINT reason_min_length CHECK (length(reason) >= 20)
);
```

**Tabela: `order_ticket_messages`**
```sql
CREATE TYPE ticket_author_type AS ENUM ('cliente', 'revendedor', 'fornecedor', 'superadmin', 'sistema');

CREATE TABLE order_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES order_tickets(id) ON DELETE CASCADE NOT NULL,
  author_id UUID NOT NULL,
  author_type ticket_author_type NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabela: `order_ticket_attachments`**
```sql
CREATE TABLE order_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES order_tickets(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES order_ticket_messages(id),
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tabela: `pending_refunds`** (para rastrear reembolsos aprovados)
```sql
CREATE TABLE pending_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES order_tickets(id) NOT NULL,
  customer_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'cancelado')),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 1.2 Índices

```sql
CREATE INDEX idx_order_tickets_order ON order_tickets(order_id);
CREATE INDEX idx_order_tickets_status ON order_tickets(status);
CREATE INDEX idx_order_tickets_responsible ON order_tickets(current_responsible);
CREATE INDEX idx_order_tickets_tipo ON order_tickets(tipo);
CREATE INDEX idx_order_tickets_customer ON order_tickets(customer_id);
CREATE INDEX idx_order_ticket_messages_ticket ON order_ticket_messages(ticket_id);
```

### 1.3 Funções Auxiliares

```sql
-- Gerar número do ticket
CREATE FUNCTION generate_ticket_number() RETURNS TEXT AS $$
BEGIN
  RETURN 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('ticket_number_seq')::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Calcular SLA baseado no tipo
CREATE FUNCTION calculate_ticket_sla(tipo order_ticket_type) 
RETURNS TABLE(first_response INTERVAL, resolution INTERVAL) AS $$
BEGIN
  CASE tipo
    WHEN 'cancelamento' THEN
      RETURN QUERY SELECT INTERVAL '4 hours', INTERVAL '24 hours';
    WHEN 'reembolso' THEN
      RETURN QUERY SELECT INTERVAL '24 hours', INTERVAL '72 hours';
    WHEN 'troca' THEN
      RETURN QUERY SELECT INTERVAL '24 hours', INTERVAL '168 hours';
  END CASE;
END;
$$ LANGUAGE plpgsql;
```

### 1.4 Políticas RLS

```sql
-- Clientes: ver apenas seus tickets
CREATE POLICY "Customers view own tickets"
ON order_tickets FOR SELECT
USING (customer_id = auth.uid());

-- Revendedores: ver tickets de seus pedidos
CREATE POLICY "Resellers view assigned tickets"
ON order_tickets FOR SELECT
USING (reseller_id = auth.uid() OR current_responsible = auth.uid());

-- Fornecedores: ver tickets de seus produtos
CREATE POLICY "Suppliers view product tickets"
ON order_tickets FOR SELECT
USING (supplier_id = auth.uid() OR current_responsible = auth.uid());

-- Superadmin: acesso total
CREATE POLICY "Superadmin full access"
ON order_tickets FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));
```

---

## Fase 2: Storage Bucket

### 2.1 Criar Bucket para Anexos

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-ticket-attachments', 'order-ticket-attachments', false);

-- Política de acesso
CREATE POLICY "Ticket participants can access attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'order-ticket-attachments' 
  AND (
    -- Verificar se usuário é participante do ticket
    EXISTS (
      SELECT 1 FROM order_tickets 
      WHERE id = (storage.foldername(name))[1]::uuid
      AND (customer_id = auth.uid() OR reseller_id = auth.uid() 
           OR supplier_id = auth.uid() OR current_responsible = auth.uid())
    )
    OR public.has_role(auth.uid(), 'super_admin')
  )
);
```

---

## Fase 3: Componentes React

### 3.1 Hooks

| Arquivo | Descrição |
|---------|-----------|
| `src/hooks/useOrderTickets.ts` | CRUD de tickets, filtros, paginação |
| `src/hooks/useOrderTicketMessages.ts` | Mensagens com realtime |
| `src/hooks/useOrderTicketStats.ts` | Métricas para dashboard |

### 3.2 Componentes Comuns

| Arquivo | Descrição |
|---------|-----------|
| `src/components/order-tickets/OpenTicketButton.tsx` | Botão condicional na página de pedidos |
| `src/components/order-tickets/OpenTicketModal.tsx` | Modal para abrir novo ticket |
| `src/components/order-tickets/TicketTimeline.tsx` | Timeline de mensagens |
| `src/components/order-tickets/TicketStatusBadge.tsx` | Badge de status com cores |
| `src/components/order-tickets/TicketTypeBadge.tsx` | Badge do tipo (reembolso/troca/etc) |
| `src/components/order-tickets/TicketSLAIndicator.tsx` | Indicador visual de SLA |
| `src/components/order-tickets/TicketAttachmentUpload.tsx` | Upload de anexos (max 5) |
| `src/components/order-tickets/TicketCard.tsx` | Card resumido do ticket |
| `src/components/order-tickets/TicketDetailsModal.tsx` | Modal com detalhes completos |

### 3.3 Páginas por Papel

**Cliente:**
- `src/pages/customer/Tickets.tsx` - Lista "Meus Tickets"
- `src/pages/customer/TicketDetails.tsx` - Detalhes e chat

**Revendedor:**
- `src/pages/reseller/Tickets.tsx` - Aba "Tickets" com badge contador
- `src/pages/reseller/TicketDetails.tsx` - Gestão com ações

**Fornecedor:**
- `src/pages/supplier/Tickets.tsx` - Tickets de troca/cancelamento
- `src/pages/supplier/TicketDetails.tsx` - Gestão com ações

**SuperAdmin:**
- `src/pages/admin/OrderTickets.tsx` - Dashboard completo

---

## Fase 4: Lógica de Negócio

### 4.1 Regras de Abertura de Ticket

```typescript
// Validações no frontend e edge function
const getAvailableTicketTypes = (orderStatus: string, paymentStatus: string) => {
  const types = [];
  
  // Reembolso: qualquer status após pago
  if (['paid', 'processing', 'shipped', 'delivered'].includes(orderStatus) 
      && paymentStatus === 'paid') {
    types.push('reembolso');
  }
  
  // Troca: enviado ou entregue
  if (['shipped', 'delivered'].includes(orderStatus)) {
    types.push('troca');
  }
  
  // Cancelamento: pago ou separado (antes do envio)
  if (['paid', 'processing'].includes(orderStatus) && orderStatus !== 'shipped') {
    types.push('cancelamento');
  }
  
  return types;
};
```

### 4.2 Atribuição Automática de Responsável

```typescript
const assignResponsible = async (ticket: OrderTicket, order: Order) => {
  let responsibleId: string;
  
  if (ticket.tipo === 'reembolso') {
    // Reembolso → Revendedor
    responsibleId = order.reseller_id;
  } else {
    // Troca/Cancelamento → Fornecedor (via produto)
    const supplierProduct = await getSupplierFromOrderItems(order.id);
    responsibleId = supplierProduct.supplier_id;
  }
  
  // Calcular SLAs
  const slaTimes = getSLATimes(ticket.tipo);
  
  return {
    current_responsible: responsibleId,
    sla_first_response: addTime(new Date(), slaTimes.firstResponse),
    sla_resolution: addTime(new Date(), slaTimes.resolution)
  };
};
```

### 4.3 SLA por Tipo

| Tipo | Primeira Resposta | Resolução |
|------|-------------------|-----------|
| Cancelamento | 4 horas | 24 horas |
| Reembolso | 24 horas | 72 horas |
| Troca | 24 horas | 7 dias |

---

## Fase 5: Edge Functions

### 5.1 `create-order-ticket`

Endpoint para criar ticket com validações:
- Verificar se pedido pertence ao cliente
- Verificar se já existe ticket aberto
- Validar tipo vs status do pedido
- Criar mensagem inicial
- Atribuir responsável automaticamente
- Calcular SLAs
- Upload de anexos (max 5)

### 5.2 `reply-order-ticket`

Endpoint para responder ticket:
- Verificar permissão de acesso
- Determinar tipo do autor
- Inserir mensagem
- Atualizar timestamps
- Transições de status automáticas

### 5.3 `update-order-ticket-status`

Endpoint para ações:
- Assumir ticket → `em_analise`
- Solicitar informações → `aguardando_cliente`
- Aprovar/Recusar → `resolvido`
- Escalar → transferir para superadmin

### 5.4 `check-sla-deadlines` (Cron)

Job agendado para:
- Verificar tickets com SLA estourado
- Escalar automaticamente para superadmin
- Adicionar mensagem de sistema
- Notificar envolvidos

---

## Fase 6: Integrações com n8n

### 6.1 Workflow: Atribuição Automática
- Trigger: INSERT em `order_tickets`
- Buscar responsável baseado no tipo
- Atualizar ticket com SLAs
- Enviar notificação

### 6.2 Workflow: Verificação SLA (Cron)
- Executar a cada 1 hora
- Identificar tickets atrasados
- Escalar para superadmin
- Enviar alertas

### 6.3 Workflow: Reembolso Aprovado
- Trigger: UPDATE com status `resolvido` e tipo `reembolso`
- Debitar saldo do revendedor
- Criar entrada em `pending_refunds`
- Notificar superadmin

---

## Fase 7: Navegação e Layout

### 7.1 Alterações em Layouts

**CustomerLayout:**
- Adicionar item "Tickets" no menu lateral

**ResellerLayout:**
- Adicionar item "Tickets" no grupo "Vendas & Finanças"
- Badge com contador de pendentes

**SupplierLayout:**
- Adicionar item "Tickets" no menu
- Badge com contador

**SuperAdminLayout:**
- Adicionar item "Tickets de Pedidos" no grupo Administração

### 7.2 Rotas (App.tsx)

```typescript
// Cliente
<Route path="tickets" element={<CustomerTickets />} />
<Route path="tickets/:ticketId" element={<CustomerTicketDetails />} />

// Revendedor
<Route path="tickets" element={<ResellerTickets />} />
<Route path="tickets/:ticketId" element={<ResellerTicketDetails />} />

// Fornecedor
<Route path="tickets" element={<SupplierTickets />} />
<Route path="tickets/:ticketId" element={<SupplierTicketDetails />} />

// SuperAdmin
<Route path="tickets-pedidos" element={<AdminOrderTickets />} />
```

---

## Fase 8: Notificações

### 8.1 Gatilhos

| Evento | Notificar | Canal |
|--------|-----------|-------|
| Ticket criado | Responsável inicial | Painel + Email |
| Nova mensagem | Todos (exceto autor) | Painel |
| Status alterado | Cliente | Email + Painel |
| SLA próximo (2h) | Responsável atual | Painel |
| SLA estourado | Responsável + Superadmin | Email + Painel |
| Ticket resolvido | Cliente | Email + Painel |

---

## Resumo de Arquivos

### Banco de Dados
- Migration: Criar tabelas, enums, índices, RLS
- Storage bucket: `order-ticket-attachments`

### Hooks (6 arquivos)
- `useOrderTickets.ts`
- `useOrderTicketMessages.ts`
- `useOrderTicketStats.ts`
- `useOrderTicketActions.ts`
- `useTicketAvailability.ts`
- `usePendingRefunds.ts`

### Componentes (12 arquivos)
- `OpenTicketButton.tsx`
- `OpenTicketModal.tsx`
- `TicketTimeline.tsx`
- `TicketMessageItem.tsx`
- `TicketStatusBadge.tsx`
- `TicketTypeBadge.tsx`
- `TicketSLAIndicator.tsx`
- `TicketAttachmentUpload.tsx`
- `TicketCard.tsx`
- `TicketDetailsModal.tsx`
- `TicketActionButtons.tsx`
- `TicketRefundModal.tsx`

### Páginas (8 arquivos)
- `src/pages/customer/Tickets.tsx`
- `src/pages/customer/TicketDetails.tsx`
- `src/pages/reseller/Tickets.tsx`
- `src/pages/reseller/TicketDetails.tsx`
- `src/pages/supplier/Tickets.tsx`
- `src/pages/supplier/TicketDetails.tsx`
- `src/pages/admin/OrderTickets.tsx`
- `src/pages/admin/OrderTicketDetails.tsx`

### Edge Functions (4 arquivos)
- `supabase/functions/create-order-ticket/index.ts`
- `supabase/functions/reply-order-ticket/index.ts`
- `supabase/functions/update-order-ticket-status/index.ts`
- `supabase/functions/check-sla-deadlines/index.ts`

### Layouts (4 arquivos modificados)
- `CustomerLayout.tsx`
- `ResellerLayout.tsx`
- `SupplierLayout.tsx`
- `SuperAdminLayout.tsx`

### App.tsx
- Adicionar rotas para todas as páginas de tickets

---

## Estimativa de Implementação

| Fase | Complexidade | Prioridade |
|------|--------------|------------|
| 1. Database | Alta | Crítica |
| 2. Storage | Baixa | Crítica |
| 3. Componentes Base | Alta | Alta |
| 4. Lógica de Negócio | Alta | Alta |
| 5. Edge Functions | Alta | Alta |
| 6. n8n Workflows | Média | Média |
| 7. Navegação | Baixa | Alta |
| 8. Notificações | Média | Média |

---

## Visualização do Fluxo

```text
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE TICKET                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CLIENTE                                                        │
│     │                                                           │
│     ▼                                                           │
│  ┌─────────────────┐                                           │
│  │ Abre Ticket     │ ──▶ Validações (status pedido, tipo)      │
│  │ (tipo + motivo) │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌────────────────────────────────────────────────────────────┐│
│  │              ATRIBUIÇÃO AUTOMÁTICA                          ││
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐││
│  │  │ Reembolso    │  │ Troca        │  │ Cancelamento       │││
│  │  │ → Revendedor │  │ → Fornecedor │  │ → Fornecedor       │││
│  │  │ SLA: 72h     │  │ SLA: 7 dias  │  │ SLA: 24h           │││
│  │  └──────────────┘  └──────────────┘  └────────────────────┘││
│  └────────────────────────────────────────────────────────────┘│
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐      ┌─────────────────┐                  │
│  │   EM ANÁLISE    │◀────▶│ AGUARDANDO      │                  │
│  │                 │      │ CLIENTE         │                  │
│  └────────┬────────┘      └─────────────────┘                  │
│           │                                                     │
│     ┌─────┴─────┐                                              │
│     ▼           ▼                                              │
│ ┌────────┐  ┌────────┐                                         │
│ │APROVADO│  │RECUSADO│                                         │
│ └───┬────┘  └───┬────┘                                         │
│     │           │                                              │
│     ▼           ▼                                              │
│  RESOLVIDO   RESOLVIDO                                         │
│     │                                                          │
│     ▼ (se reembolso aprovado)                                  │
│  ┌─────────────────────────────┐                               │
│  │ Débito saldo revendedor     │                               │
│  │ Crédito pending_refunds     │                               │
│  │ Notifica Superadmin         │                               │
│  └─────────────────────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```
