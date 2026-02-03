

# Plano: Alterar Status Inicial para "Pendente" quando Pedido é Pago

## Objetivo

Quando um pagamento é aprovado (status `approved` do Mercado Pago), o status de envio do pedido deve ser definido como `pending` (Pendente) em vez de `processing` (Em preparação).

---

## Arquivos a Alterar

### 1. `supabase/functions/webhook-n8n-payment/index.ts`

**Linha 128-132:**

De:
```typescript
case 'approved':
  newStatus = 'processing';
  paymentStatus = 'paid';
  console.log('Payment approved - updating to processing status');
  break;
```

Para:
```typescript
case 'approved':
  newStatus = 'pending';
  paymentStatus = 'paid';
  console.log('Payment approved - order ready for shipping preparation');
  break;
```

---

### 2. `supabase/functions/check-pending-payments/index.ts`

**Linha 109-114:**

De:
```typescript
case 'approved':
  newStatus = 'processing';
  newPaymentStatus = 'paid';
  action = 'updated_to_processing';
  break;
```

Para:
```typescript
case 'approved':
  newStatus = 'pending';
  newPaymentStatus = 'paid';
  action = 'updated_to_pending_paid';
  break;
```

---

### 3. `supabase/functions/webhook-mercadopago/index.ts`

**Linha 133-137:**

De:
```typescript
case 'approved':
  newStatus = 'processing';
  paymentStatus = 'paid';
  break;
```

Para:
```typescript
case 'approved':
  newStatus = 'pending';
  paymentStatus = 'paid';
  break;
```

---

## Fluxo de Status de Envio Atualizado

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE STATUS DE ENVIO                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Pedido Criado (aguardando pagamento)                        │
│     └─> status: pending, payment_status: pending                │
│                                                                 │
│  2. Pagamento Aprovado (ALTERACAO)                              │
│     └─> status: pending, payment_status: paid                   │
│         (Antes era: status: processing)                         │
│                                                                 │
│  3. Admin altera para "Em preparacao"                           │
│     └─> status: processing                                      │
│                                                                 │
│  4. Admin altera para "Despachado"                              │
│     └─> status: shipped                                         │
│                                                                 │
│  5. Admin altera para "Finalizado"                              │
│     └─> status: delivered                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resumo das Alteracoes

| Arquivo | Linha | Alteracao |
|---------|-------|-----------|
| `webhook-n8n-payment/index.ts` | 130 | `'processing'` -> `'pending'` |
| `check-pending-payments/index.ts` | 111 | `'processing'` -> `'pending'` |
| `webhook-mercadopago/index.ts` | 135 | `'processing'` -> `'pending'` |

---

## Beneficios

1. **Controle manual do fluxo** - Admin decide quando iniciar preparacao
2. **Visibilidade clara** - Pedidos pagos ficam como "Pendente" aguardando acao
3. **Diferenciacao** - Distingue pedidos pagos (payment_status: paid) de nao pagos

