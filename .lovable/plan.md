
# Plano: Sistema de Webhooks Configuráveis

## Objetivo

Implementar um sistema completo de webhooks que permite configurar URLs para receber eventos da plataforma. Inclui uma nova sub-página "Webhooks" dentro de "API Docs" e edge functions para disparar os eventos.

---

## Eventos a Implementar

| Evento | Trigger | Payload |
|--------|---------|---------|
| `order.paid` | Quando payment_status muda para "paid" | Dados do pedido, cliente, produtos |
| `user.created` | Quando um novo usuário é criado | Dados do usuário, role, loja de origem |
| `user.inactive.7days` | Usuário sem login há 7 dias | Dados do usuário, última atividade |
| `user.inactive.15days` | Usuário sem login há 15 dias | Dados do usuário, última atividade |
| `user.inactive.30days` | Usuário sem login há 30 dias | Dados do usuário, última atividade |

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLUXO DE WEBHOOKS                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CONFIGURACAO (UI)                                                   │
│     └─> Sub-página "Webhooks" em API Docs                              │
│         └─> Campos para URLs de cada evento                            │
│         └─> Toggle para ativar/desativar                               │
│         └─> Botão de teste                                             │
│                                                                         │
│  2. ARMAZENAMENTO                                                       │
│     └─> Nova tabela: webhook_settings                                  │
│         └─> event_type, webhook_url, active, secret_token              │
│                                                                         │
│  3. DISPARO                                                             │
│     └─> Edge Function: dispatch-webhook                                │
│         └─> Recebe evento + payload                                    │
│         └─> Busca URL configurada                                      │
│         └─> Envia POST com signature HMAC                              │
│         └─> Registra log                                               │
│                                                                         │
│  4. TRIGGERS                                                            │
│     └─> order.paid: Chamado pelo webhook-n8n-payment                   │
│     └─> user.created: Chamado pelo api-usuarios-cadastrar              │
│     └─> user.inactive: Edge function scheduled (cron diário)           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Estrutura da Tabela webhook_settings

```sql
CREATE TABLE webhook_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL UNIQUE,
  webhook_url TEXT,
  active BOOLEAN DEFAULT false,
  secret_token TEXT,
  last_triggered_at TIMESTAMPTZ,
  last_status_code INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir eventos iniciais
INSERT INTO webhook_settings (event_type, active) VALUES
  ('order.paid', false),
  ('user.created', false),
  ('user.inactive.7days', false),
  ('user.inactive.15days', false),
  ('user.inactive.30days', false);
```

---

## Payloads dos Eventos

### order.paid

```json
{
  "event": "order.paid",
  "timestamp": "2026-02-01T12:00:00Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-20260201-000001",
    "total_amount": 199.90,
    "payment_method": "pix",
    "customer": {
      "user_id": "uuid",
      "email": "cliente@email.com",
      "name": "João Silva",
      "phone": "11999999999"
    },
    "reseller": {
      "user_id": "uuid",
      "store_name": "Loja do João"
    },
    "items": [
      { "product_id": "uuid", "name": "Produto X", "quantity": 2, "unit_price": 99.95 }
    ]
  }
}
```

### user.created

```json
{
  "event": "user.created",
  "timestamp": "2026-02-01T12:00:00Z",
  "data": {
    "user_id": "uuid",
    "email": "novo@email.com",
    "name": "Maria Santos",
    "phone": "11988888888",
    "role": "reseller",
    "origin": {
      "type": "api",
      "store_id": "uuid-loja",
      "store_name": "Loja Origem"
    },
    "created_at": "2026-02-01T12:00:00Z"
  }
}
```

### user.inactive.Xdays

```json
{
  "event": "user.inactive.7days",
  "timestamp": "2026-02-01T12:00:00Z",
  "data": {
    "user_id": "uuid",
    "email": "usuario@email.com",
    "name": "Carlos Souza",
    "role": "customer",
    "last_sign_in_at": "2026-01-25T10:30:00Z",
    "days_inactive": 7,
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

## Arquivos a Criar

### 1. Tabela no Banco

```text
Migration: Criar tabela webhook_settings com campos para cada evento
```

### 2. Edge Function: dispatch-webhook

```text
Arquivo: supabase/functions/dispatch-webhook/index.ts

Responsabilidades:
- Receber event_type e payload
- Buscar configuração ativa
- Gerar HMAC signature com secret_token
- Enviar POST para webhook_url
- Registrar sucesso/erro no log
- Atualizar last_triggered_at e last_status_code
```

### 3. Edge Function: check-inactive-users

```text
Arquivo: supabase/functions/check-inactive-users/index.ts

Responsabilidades:
- Buscar usuários com 7, 15 e 30 dias sem login
- Para cada grupo, disparar dispatch-webhook
- Evitar duplicatas (registrar último disparo por usuário)
```

### 4. Componente: WebhooksSection

```text
Arquivo: src/components/admin/WebhooksSection.tsx

Interface:
- Lista de eventos disponíveis
- Campo URL para cada evento
- Toggle ativo/inativo
- Botão "Testar" para enviar evento de teste
- Mostrar último status e data de disparo
- Campo para visualizar/gerar secret token
```

### 5. Hook: useWebhookSettings

```text
Arquivo: src/hooks/useWebhookSettings.ts

Funções:
- fetchWebhookSettings() - Listar configurações
- updateWebhookUrl(event_type, url) - Atualizar URL
- toggleWebhookActive(event_type) - Ativar/desativar
- testWebhook(event_type) - Enviar evento de teste
- regenerateSecret(event_type) - Gerar novo token
```

---

## Arquivos a Modificar

### 1. ApiDocsSidebar.tsx

```text
Adicionar item "Webhooks" na lista de seções estáticas (após "Chaves de API")
```

### 2. ApiDocsContent.tsx

```text
Adicionar renderização condicional para selectedSection === 'webhooks'
Exibir o componente WebhooksSection
```

### 3. webhook-n8n-payment/index.ts

```text
Após atualizar status do pedido para "paid":
- Chamar dispatch-webhook com event_type="order.paid"
```

### 4. api-usuarios-cadastrar/index.ts

```text
Após criar usuário com sucesso:
- Chamar dispatch-webhook com event_type="user.created"
- Incluir role e origem_loja_id no payload
```

### 5. supabase/config.toml

```text
Adicionar configurações para novas edge functions:
- dispatch-webhook (verify_jwt = false)
- check-inactive-users (verify_jwt = false)
```

---

## Interface Visual - Sub-página Webhooks

```text
┌──────────────────────────────────────────────────────────────────────┐
│  🔗 Webhooks                                                         │
│                                                                      │
│  Configure URLs para receber eventos em tempo real da plataforma.   │
│  Todos os eventos são enviados via POST com assinatura HMAC-SHA256. │
│                                                                      │
│  ────────────────────────────────────────────────────────────────    │
│                                                                      │
│  📦 Pedido Pago                                            [Ativo ✓]│
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ https://seu-sistema.com/webhook/order-paid                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  Último disparo: 01/02/2026 10:30 • Status: 200 OK    [🧪 Testar]  │
│                                                                      │
│  ────────────────────────────────────────────────────────────────    │
│                                                                      │
│  👤 Usuário Criado                                         [Inativo]│
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Insira a URL do webhook...                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ────────────────────────────────────────────────────────────────    │
│                                                                      │
│  ⏰ Usuário Inativo (7 dias)                               [Inativo]│
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ Insira a URL do webhook...                                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ────────────────────────────────────────────────────────────────    │
│                                                                      │
│  ⏰ Usuário Inativo (15 dias)                              [Inativo]│
│  ⏰ Usuário Inativo (30 dias)                              [Inativo]│
│                                                                      │
│  ────────────────────────────────────────────────────────────────    │
│                                                                      │
│  🔐 Secret Token (para validar assinatura HMAC)                     │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ whsec_a1b2c3d4e5f6...                              [🔄 Gerar]  │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Resumo de Alterações

### Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/dispatch-webhook/index.ts` | Edge function para disparar webhooks |
| `supabase/functions/check-inactive-users/index.ts` | Edge function para verificar usuários inativos |
| `src/components/admin/WebhooksSection.tsx` | Componente da interface de configuração |
| `src/hooks/useWebhookSettings.ts` | Hook para gerenciar configurações de webhooks |

### Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/ApiDocsSidebar.tsx` | Adicionar item "Webhooks" no menu |
| `src/components/admin/ApiDocsContent.tsx` | Renderizar WebhooksSection quando selecionado |
| `supabase/functions/webhook-n8n-payment/index.ts` | Disparar evento order.paid após pagamento |
| `supabase/functions/api-usuarios-cadastrar/index.ts` | Disparar evento user.created após cadastro |
| `supabase/config.toml` | Adicionar novas edge functions |

### Migração SQL

| Alteração | Descrição |
|-----------|-----------|
| Nova tabela | `webhook_settings` com campos para configuração de cada evento |
| RLS | Apenas super_admin pode acessar/modificar |

---

## Segurança

| Aspecto | Implementação |
|---------|---------------|
| Autenticação | HMAC-SHA256 signature no header `X-Webhook-Signature` |
| Acesso | Apenas super_admin pode configurar webhooks |
| Secret Token | Gerado automaticamente, pode ser regenerado |
| Timeout | Máximo 10 segundos para resposta |
| Retry | Não implementado inicialmente (pode ser adicionado) |

---

## Benefícios

| Funcionalidade | Benefício |
|----------------|-----------|
| Configuração via UI | Sem necessidade de alterar código |
| Múltiplos eventos | Flexibilidade para integrações |
| Teste de webhook | Validação antes de ativar |
| Histórico de status | Monitoramento de falhas |
| HMAC signature | Segurança na validação |
