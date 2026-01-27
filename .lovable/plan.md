

# Corrigir Card de Suporte Vazio

## Problema Identificado

O card "Precisa de Ajuda com Este Pedido?" está sendo exibido para todos os clientes, mas o botão "Abrir Ticket" dentro dele só aparece quando existem tipos de ticket disponíveis para o status atual do pedido. Isso resulta em um card vazio como mostrado na imagem.

---

## Solução

Mover a lógica de verificação de elegibilidade para o nível do card, não apenas do botão. O card inteiro só deve aparecer se:
1. Não for admin (`!isAdmin`)
2. Existir o pedido (`order`)
3. **E** houver tipos de ticket disponíveis para este pedido **OU** já existir um ticket aberto

---

## Alterações em `src/components/OrderDetailsModal.tsx`

### 1. Importar a função de validação

```typescript
import { getAvailableTicketTypes } from '@/types/orderTickets';
```

### 2. Adicionar verificação de elegibilidade

Antes de renderizar o card, verificar se há tipos disponíveis:

```typescript
// Calcular se há ticket types disponíveis
const availableTicketTypes = order 
  ? getAvailableTicketTypes(order.status, order.payment_status) 
  : [];

const showTicketCard = !isAdmin && order && (
  existingTicketId || availableTicketTypes.length > 0
);
```

### 3. Condicionar o Card

```tsx
{/* Suporte ao Pedido - Apenas para Clientes com tickets elegíveis */}
{showTicketCard && (
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

## Resultado Esperado

| Status do Pedido | Payment Status | Comportamento |
|------------------|----------------|---------------|
| pending | pending | Card NÃO aparece |
| confirmed/processing | paid | Card aparece com botão "Abrir Ticket" |
| shipped/delivered | paid | Card aparece com botão "Abrir Ticket" |
| Qualquer com ticket aberto | - | Card aparece com botão "Ver Ticket Aberto" |

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/OrderDetailsModal.tsx` | Adicionar import de `getAvailableTicketTypes` e condicionar exibição do card |

