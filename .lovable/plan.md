

# Plano: Expiração por Quantidade de Dias no Cadastro

## Lógica Proposta

Aceitar **quantidade de dias** como parâmetro alternativo à data fixa. O sistema calcula automaticamente a data de expiração.

---

## Parâmetros Aceitos (mutuamente exclusivos)

| Parâmetro | Tipo | Exemplo | Descrição |
|-----------|------|---------|-----------|
| `subscription_days` | number | `30` | Quantidade de dias a partir de hoje |
| `subscription_expires_at` | string | `2026-02-28T...` | Data fixa ISO (opcional) |

**Prioridade:** Se ambos forem enviados, `subscription_days` tem precedência.

---

## Exemplos de Uso

### Por dias (recomendado)
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "full_name": "João Silva",
  "role": "reseller",
  "subscription_plan": "premium",
  "subscription_days": 30
}
```
**Resultado:** `subscription_expires_at = now() + 30 dias`

### Por data fixa
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "subscription_expires_at": "2026-12-31T23:59:59Z"
}
```

---

## Alterações

### 1. Edge Function `api-usuarios-cadastrar/index.ts`

```typescript
const { 
  email, 
  full_name, 
  password, 
  role = 'customer',
  subscription_plan,
  subscription_days,        // NOVO: quantidade de dias
  subscription_expires_at,  // data fixa alternativa
  phone
} = body;

// Calcular data de expiração
let calculatedExpiresAt: string | null = null;

if (subscription_days && subscription_days > 0) {
  // Calcular a partir de quantidade de dias
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + subscription_days);
  calculatedExpiresAt = expirationDate.toISOString();
} else if (subscription_expires_at) {
  // Usar data fixa informada
  calculatedExpiresAt = subscription_expires_at;
}

// Atualizar perfil
await supabase.from('profiles').update({
  first_name: firstName,
  last_name: lastName,
  role: role,
  phone: phone || null,
  subscription_plan: subscription_plan || 'free',
  subscription_expires_at: calculatedExpiresAt
}).eq('user_id', authData.user.id);
```

### 2. Documentação `src/data/apiEndpointsData.ts`

**Request Body:**
```typescript
requestBody: {
  email: 'novo@email.com',
  full_name: 'Maria Santos',
  password: 'senhaSegura123!',
  role: 'reseller',
  phone: '11999999999',
  subscription_plan: 'premium',
  subscription_days: 30,
  _nota: 'Use subscription_days OU subscription_expires_at'
}
```

**Response:**
```typescript
responseExample: {
  success: true,
  message: 'Usuário criado com sucesso',
  data: {
    user_id: 'uuid',
    email: 'novo@email.com',
    full_name: 'Maria Santos',
    role: 'reseller',
    subscription_plan: 'premium',
    subscription_expires_at: '2026-02-28T00:00:00Z',
    subscription_days_granted: 30,
    created_at: '2026-01-29T00:00:00Z'
  }
}
```

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/api-usuarios-cadastrar/index.ts` | Adicionar lógica de cálculo por dias |
| `src/data/apiEndpointsData.ts` | Atualizar documentação do endpoint |

---

## Tabela de Parâmetros Final

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email do usuário |
| `password` | string | Sim | Senha do usuário |
| `full_name` | string | Não | Nome completo |
| `role` | string | Não | Role (default: customer) |
| `phone` | string | Não | Telefone |
| `subscription_plan` | string | Não | Plano: free ou premium (default: free) |
| `subscription_days` | number | Não | Dias de acesso a partir de hoje |
| `subscription_expires_at` | string | Não | Data fixa de expiração ISO |

