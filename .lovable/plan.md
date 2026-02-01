

# Plano: Usar Dados Reais nos Testes de Todos os Webhooks

## Objetivo

Modificar o sistema para que ao clicar em "Testar" em qualquer webhook, o sistema busque dados reais do banco de dados, garantindo testes mais realistas e úteis.

---

## Eventos e Fontes de Dados

| Evento | Fonte de Dados |
|--------|----------------|
| `order.paid` | Último pedido com `payment_status = 'paid'` |
| `user.created` | Último usuário criado (mais recente) |
| `user.inactive.7days` | Usuário com `last_sign_in_at` há mais de 7 dias |
| `user.inactive.15days` | Usuário com `last_sign_in_at` há mais de 15 dias |
| `user.inactive.30days` | Usuário com `last_sign_in_at` há mais de 30 dias |

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE TESTE COM DADOS REAIS                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Frontend (clica Testar)                                               │
│         │                                                               │
│         ▼                                                               │
│  dispatch-webhook (is_test=true, use_real_data=true)                   │
│         │                                                               │
│         ▼                                                               │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ Switch por event_type:                                          │   │
│  │                                                                  │   │
│  │  order.paid ───────────> fetchLastPaidOrder()                   │   │
│  │  user.created ─────────> fetchLastCreatedUser()                 │   │
│  │  user.inactive.7days ──> fetchInactiveUser(7)                   │   │
│  │  user.inactive.15days ─> fetchInactiveUser(15)                  │   │
│  │  user.inactive.30days ─> fetchInactiveUser(30)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│         │                                                               │
│         ▼                                                               │
│  Envia para URL configurada com dados reais + flag _test               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Queries para Buscar Dados Reais

### 1. order.paid - Último Pedido Pago

```sql
SELECT 
  o.id, o.order_number, o.total_amount, o.payment_method,
  o.user_id, p.first_name, p.last_name, p.phone, au.email,
  o.reseller_id, rs.store_name
FROM orders o
LEFT JOIN profiles p ON p.user_id = o.user_id
LEFT JOIN auth.users au ON au.id = o.user_id
LEFT JOIN reseller_stores rs ON rs.user_id = o.reseller_id
WHERE o.payment_status = 'paid'
ORDER BY o.created_at DESC
LIMIT 1
```

### 2. user.created - Último Usuário Criado

```sql
SELECT 
  p.user_id, au.email, p.first_name, p.last_name, 
  p.phone, p.role, p.created_at
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
ORDER BY p.created_at DESC
LIMIT 1
```

### 3. user.inactive.Xdays - Usuário Inativo

```sql
SELECT 
  p.user_id, au.email, p.first_name, p.last_name, 
  p.role, au.last_sign_in_at, p.created_at
FROM profiles p
JOIN auth.users au ON au.id = p.user_id
WHERE au.last_sign_in_at < NOW() - INTERVAL 'X days'
  AND au.last_sign_in_at IS NOT NULL
ORDER BY au.last_sign_in_at DESC
LIMIT 1
```

---

## Alterações Necessárias

### 1. dispatch-webhook/index.ts

Adicionar funções para buscar dados reais de cada evento:

```typescript
// Novas funções a adicionar:

async function fetchLastPaidOrder(supabase) {
  // Busca último pedido pago com todos os dados relacionados
}

async function fetchLastCreatedUser(supabase) {
  // Busca último usuário criado
}

async function fetchInactiveUser(supabase, days: number) {
  // Busca usuário inativo há X dias
}

async function fetchRealTestData(supabase, eventType: string) {
  switch (eventType) {
    case 'order.paid':
      return await fetchLastPaidOrder(supabase);
    case 'user.created':
      return await fetchLastCreatedUser(supabase);
    case 'user.inactive.7days':
      return await fetchInactiveUser(supabase, 7);
    case 'user.inactive.15days':
      return await fetchInactiveUser(supabase, 15);
    case 'user.inactive.30days':
      return await fetchInactiveUser(supabase, 30);
    default:
      return null;
  }
}
```

**Lógica principal modificada:**

```typescript
// No handler principal, após validar is_test:

if (is_test && use_real_data) {
  const realData = await fetchRealTestData(supabase, event_type);
  
  if (!realData) {
    return Response: "Nenhum dado encontrado para teste de " + event_type;
  }
  
  payload = realData;
}
```

### 2. useWebhookSettings.ts

Modificar para sempre usar dados reais:

```typescript
const testWebhook = async (eventType: string) => {
  const { data, error } = await supabase.functions.invoke('dispatch-webhook', {
    body: {
      event_type: eventType,
      payload: undefined,  // Não envia payload mockado
      is_test: true,
      use_real_data: true, // Sempre buscar dados reais
    },
  });
  // ...
};
```

Remover a função `getTestPayload()` que gera dados mockados.

---

## Payloads com Dados Reais

### order.paid

```json
{
  "event": "order.paid",
  "timestamp": "2026-02-01T12:00:00Z",
  "data": {
    "_test": true,
    "_test_message": "Dados reais do último pedido pago",
    "order_id": "c40b90a5-...",
    "order_number": "ORD-1769828426038_865529AC",
    "total_amount": 19.98,
    "payment_method": "pix",
    "customer": {
      "user_id": "865529ac-...",
      "email": "cliente@real.com",
      "name": "Bruno Dotta",
      "phone": "49999910306"
    },
    "reseller": { ... },
    "items": [ ... ]
  }
}
```

### user.created

```json
{
  "event": "user.created",
  "timestamp": "2026-02-01T12:00:00Z",
  "data": {
    "_test": true,
    "_test_message": "Dados reais do último usuário criado",
    "user_id": "uuid-real",
    "email": "usuario@real.com",
    "name": "Maria Silva",
    "phone": "11988887777",
    "role": "reseller",
    "origin": {
      "type": "manual",
      "store_id": null,
      "store_name": null
    },
    "created_at": "2026-01-30T10:00:00Z"
  }
}
```

### user.inactive.Xdays

```json
{
  "event": "user.inactive.7days",
  "timestamp": "2026-02-01T12:00:00Z",
  "data": {
    "_test": true,
    "_test_message": "Dados reais de usuário inativo",
    "user_id": "uuid-real",
    "email": "inativo@real.com",
    "name": "João Santos",
    "role": "customer",
    "last_sign_in_at": "2026-01-24T15:30:00Z",
    "days_inactive": 8,
    "created_at": "2025-12-01T00:00:00Z"
  }
}
```

---

## Tratamento de Erros

| Cenário | Mensagem de Erro |
|---------|------------------|
| Nenhum pedido pago | "Nenhum pedido pago encontrado para teste" |
| Nenhum usuário criado | "Nenhum usuário encontrado para teste" |
| Nenhum usuário inativo 7d | "Nenhum usuário inativo há 7+ dias encontrado" |
| Nenhum usuário inativo 15d | "Nenhum usuário inativo há 15+ dias encontrado" |
| Nenhum usuário inativo 30d | "Nenhum usuário inativo há 30+ dias encontrado" |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/dispatch-webhook/index.ts` | Adicionar funções de busca de dados reais para todos os eventos |
| `src/hooks/useWebhookSettings.ts` | Remover `getTestPayload()` e sempre enviar `use_real_data: true` |

---

## Resumo das Funções a Adicionar

```text
dispatch-webhook/index.ts:
├── fetchLastPaidOrder(supabase)
│   └── Retorna último pedido pago com customer, reseller e items
├── fetchLastCreatedUser(supabase)
│   └── Retorna último usuário criado com profile e role
├── fetchInactiveUser(supabase, days)
│   └── Retorna usuário inativo há X dias
└── fetchRealTestData(supabase, eventType)
    └── Switch que chama a função correta por evento
```

---

## Benefícios

| Melhoria | Benefício |
|----------|-----------|
| Dados reais em todos os testes | Debugging mais eficiente |
| Consistência | Todos os eventos funcionam da mesma forma |
| Sem manutenção de mocks | Menos código para manter |
| Testes realistas | Payloads idênticos aos de produção |

