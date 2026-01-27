
# Adicionar Botão "Abrir Ticket" nos Detalhes do Pedido

## Objetivo

Integrar o componente `OpenTicketButton` dentro do modal `OrderDetailsModal.tsx`, permitindo que clientes abram tickets de suporte (reembolso, troca, cancelamento) diretamente da visualização de detalhes do pedido.

---

## Análise do Contexto

### Componentes Envolvidos

| Componente | Função |
|------------|--------|
| `OrderDetailsModal.tsx` | Modal que exibe detalhes do pedido |
| `OpenTicketButton.tsx` | Botão inteligente que verifica elegibilidade e abre modal de ticket |
| `OpenTicketModal.tsx` | Modal para criação do ticket |

### Dados Disponíveis no OrderDetailsModal

O componente já possui todas as informações necessárias:
- `order.id` - ID do pedido
- `order.status` - Status do pedido (pending, processing, shipped, delivered, etc.)
- `order.payment_status` - Status de pagamento (paid, pending)
- `profile?.role` - Papel do usuário (customer, admin, etc.)

---

## Alterações em `src/components/OrderDetailsModal.tsx`

### 1. Adicionar Import

```typescript
import { OpenTicketButton } from '@/components/order-tickets/OpenTicketButton';
```

### 2. Adicionar Estado para Ticket Existente

Criar lógica para verificar se já existe um ticket aberto para este pedido:

```typescript
const [existingTicketId, setExistingTicketId] = useState<string | null>(null);

// Adicionar ao useEffect existente
const fetchExistingTicket = async () => {
  if (!orderId) return;
  const { data } = await supabase
    .from('order_tickets')
    .select('id')
    .eq('order_id', orderId)
    .not('status', 'in', '("resolvido","cancelado")')
    .maybeSingle();
  setExistingTicketId(data?.id || null);
};
```

### 3. Posicionamento do Botão

Adicionar o botão em um local proeminente, após o card de "Resumo do Pedido" (para clientes) ou como parte da seção de ações. Melhores opções:

**Opção A - Após o Card de Valor (para clientes)**
Após a linha 873, dentro da área do resumo simplificado:

```tsx
{/* Botão de Abrir Ticket - Apenas para Clientes */}
{!isAdmin && order && (
  <div className="flex justify-end pt-4">
    <OpenTicketButton
      orderId={order.id}
      orderStatus={order.status}
      paymentStatus={order.payment_status}
      existingTicketId={existingTicketId}
      variant="outline"
      size="default"
    />
  </div>
)}
```

**Opção B - Card dedicado para Suporte**
Criar um card específico para ações de suporte:

```tsx
{/* Suporte ao Pedido - Apenas para Clientes */}
{!isAdmin && order && (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4" />
        Precisa de Ajuda?
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-3">
        Problemas com seu pedido? Abra um ticket para solicitar reembolso, troca ou cancelamento.
      </p>
      <OpenTicketButton
        orderId={order.id}
        orderStatus={order.status}
        paymentStatus={order.payment_status}
        existingTicketId={existingTicketId}
        variant="default"
        size="default"
        className="w-full"
      />
    </CardContent>
  </Card>
)}
```

---

## Fluxo Visual

```text
┌─────────────────────────────────────────────────────────────────┐
│ Detalhes do Pedido #12345                           [X]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Informações do Cliente                                      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Produtos                                                    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Resumo do Pedido                                            │ │
│ │                                                             │ │
│ │ Valor:                                          R$ 99,90    │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 💬 Precisa de Ajuda?                                        │ │ ← NOVO
│ │                                                             │ │
│ │ Problemas com seu pedido? Abra um ticket para solicitar     │ │
│ │ reembolso, troca ou cancelamento.                           │ │
│ │                                                             │ │
│ │               [  📩 Abrir Ticket  ]                         │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Endereço de Entrega                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementação Detalhada

### Alterações no Arquivo

| Linha | Alteração |
|-------|-----------|
| ~9 | Adicionar import do `OpenTicketButton` e `MessageSquarePlus` |
| ~87 | Adicionar estado `existingTicketId` |
| ~108 | Adicionar chamada `fetchExistingTicket()` no useEffect |
| ~160 | Criar função `fetchExistingTicket` |
| ~873 | Adicionar Card "Precisa de Ajuda?" após o resumo do pedido |

### Código Completo da Seção

```tsx
{/* Suporte ao Pedido - Apenas para Clientes */}
{!isAdmin && order && (
  <Card className="border-primary/20 bg-primary/5">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center gap-2">
        <MessageSquarePlus className="h-4 w-4 text-primary" />
        Precisa de Ajuda com Este Pedido?
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground mb-4">
        Se você teve algum problema com seu pedido, pode abrir um ticket para solicitar reembolso, troca ou cancelamento.
      </p>
      <OpenTicketButton
        orderId={order.id}
        orderStatus={order.status}
        paymentStatus={order.payment_status}
        existingTicketId={existingTicketId}
        variant="default"
        size="default"
        className="w-full"
      />
    </CardContent>
  </Card>
)}
```

---

## Comportamento do Botão

| Cenário | Comportamento |
|---------|---------------|
| Cliente com pedido elegível | Mostra "Abrir Ticket" |
| Cliente com ticket já aberto | Mostra "Ver Ticket Aberto" (navega para detalhes) |
| Cliente com pedido não elegível | Botão não aparece |
| Admin/Revendedor visualizando | Card inteiro não aparece |

---

## Resumo das Alterações

| Arquivo | Tipo | Descrição |
|---------|------|-----------|
| `src/components/OrderDetailsModal.tsx` | Modificar | Adicionar import, estado, fetch e card do ticket |

---

## Benefícios

- Acesso direto à abertura de ticket a partir dos detalhes do pedido
- Experiência fluida sem navegação adicional
- Visual destacado para chamar atenção do cliente
- Lógica inteligente que mostra opções apenas quando relevantes
