

# Permitir Abertura de Tickets para Todos os Usuários de "Minha Conta"

## Problema Identificado

O componente `OpenTicketButton` possui uma verificação hardcoded que bloqueia qualquer usuário que não seja exatamente `'customer'`:

```typescript
// src/components/order-tickets/OpenTicketButton.tsx linha 33-36
if (profile?.role !== 'customer') {
  return null;  // ← Bloqueia resellers, suppliers, etc.
}
```

Isso faz com que o card "Precisa de Ajuda?" apareça vazio para resellers e outros usuários.

---

## Solução

Remover a restrição de role no `OpenTicketButton` para que **todos os usuários autenticados** possam abrir tickets, já que todos têm acesso às rotas de `/minha-conta`.

---

## Alterações Necessárias

### Arquivo: `src/components/order-tickets/OpenTicketButton.tsx`

**Remover as linhas 33-36:**

```typescript
// REMOVER ESTE BLOCO:
// Only customers can open tickets
if (profile?.role !== 'customer') {
  return null;
}
```

**Substituir por verificação de autenticação:**

```typescript
// Apenas usuários autenticados podem abrir tickets
if (!profile) {
  return null;
}
```

---

## Código Final do Componente (início)

```typescript
export const OpenTicketButton = ({
  orderId,
  orderStatus,
  paymentStatus,
  existingTicketId,
  variant = 'outline',
  size = 'sm',
  className,
}: OpenTicketButtonProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Apenas usuários autenticados podem abrir tickets
  if (!profile) {
    return null;
  }

  // If there's already an open ticket, show link to it
  if (existingTicketId) {
    // ... resto do código
  }
  // ...
};
```

---

## Resultado Esperado

| Role do Usuário | Acesso a /minha-conta | Card Visível | Botão Visível |
|-----------------|----------------------|--------------|---------------|
| customer | Sim | Sim (se elegível) | Sim |
| reseller | Sim | Sim (se elegível) | Sim |
| supplier | Sim | Sim (se elegível) | Sim |
| admin/super_admin | Sim | Não | - |

---

## Resumo das Alterações

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/components/order-tickets/OpenTicketButton.tsx` | 33-36 | Trocar `profile?.role !== 'customer'` por `!profile` |

