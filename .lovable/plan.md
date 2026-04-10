

# Sistema de Carteira Interna

## Resumo
Implementar carteira digital completa: tabelas `wallets` e `wallet_transactions`, stored procedures atômicas, página do usuário com saldo/extrato, modal de recarga via PIX, opção de pagamento com saldo no checkout, estorno automático, painel admin, e configurações.

---

## 1. Migração SQL

### Tabelas e Enum

```sql
-- Enum
CREATE TYPE wallet_transaction_tipo AS ENUM (
  'recarga', 'pagamento_pedido', 'estorno', 'bonus',
  'ajuste_credito', 'ajuste_debito', 'cashback'
);

-- Carteira (1 por usuário)
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  saldo DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  saldo_bloqueado DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (saldo_bloqueado >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transações
CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  tipo wallet_transaction_tipo NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  taxa DECIMAL(10,2) DEFAULT 0,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  saldo_anterior DECIMAL(10,2) NOT NULL,
  saldo_posterior DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  referencia_tipo TEXT,
  referencia_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Configurações na platform_settings
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS carteira_valor_minimo DECIMAL(10,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS carteira_valor_maximo DECIMAL(10,2) DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS carteira_taxa_percentual DECIMAL(5,2) DEFAULT 5.5,
  ADD COLUMN IF NOT EXISTS carteira_valores_sugeridos JSONB DEFAULT '[100,200,300,500]',
  ADD COLUMN IF NOT EXISTS carteira_pagamento_parcial BOOLEAN DEFAULT false;
```

### Stored Procedures

- **`debitar_carteira(p_user_id, p_valor, p_descricao, p_referencia_tipo, p_referencia_id)`** — debita com `FOR UPDATE` lock, verifica saldo, cria transação, retorna JSON
- **`creditar_carteira(p_user_id, p_valor, p_taxa, p_descricao, p_referencia_tipo, p_referencia_id, p_tipo)`** — credita saldo, cria transação
- **Trigger `create_wallet_on_user`** — cria carteira automaticamente ao criar profile

### RLS

- `wallets`: usuário vê apenas sua carteira; admin vê todas
- `wallet_transactions`: usuário vê transações da sua carteira; admin vê todas

---

## 2. Hooks React

### `src/hooks/useWallet.ts`
- `useWallet()` — busca carteira do usuário logado (saldo, saldo_bloqueado)
- `useWalletTransactions(page, limit)` — extrato paginado
- `useWalletSettings()` — busca configs da carteira (taxa, mín, máx, valores sugeridos)

---

## 3. Página: Minha Carteira

### `src/pages/customer/CustomerWallet.tsx`
- Card com saldo disponível e botão "Adicionar Saldo"
- Lista de transações com ícone por tipo, valor (+/-), data formatada
- Para recargas: exibe taxa e valor pago

### `src/components/wallet/AddBalanceModal.tsx`
- Botões de valores sugeridos (da config)
- Input para valor customizado
- Resumo em tempo real (saldo + taxa = total)
- Botão "Gerar PIX" → chama edge function de recarga
- Após geração: exibe QR Code reutilizando `PixPaymentModal`

---

## 4. Edge Function: `wallet-recharge`

- Recebe `{ valor }` do usuário autenticado
- Valida min/max
- Calcula taxa
- Cria transação pendente em `wallet_transactions`
- Chama o mesmo fluxo PIX (N8N/create-pix-payment) com `external_reference = wallet_transaction_id`
- Retorna QR Code

---

## 5. Webhook: Confirmação de Recarga

### Atualizar `webhook-n8n-payment` (ou criar handler dedicado)
- Quando `external_reference` começa com prefixo de carteira:
  - Buscar transação pendente
  - Chamar `creditar_carteira` via RPC
  - Atualizar status para `completed`
  - Enviar notificação ao usuário

---

## 6. Checkout: Pagamento com Saldo

### `src/pages/Checkout.tsx`
- No step 3, antes do PIX, exibir opção "Saldo da Carteira" se carteira tem saldo > 0
- Se saldo >= total: pagamento instantâneo via RPC `debitar_carteira`, pedido vai para `pago`
- Se saldo < total: exibir "saldo insuficiente" com link para adicionar saldo
- Pagamento parcial (futuro, controlado por config `carteira_pagamento_parcial`)

---

## 7. Estorno Automático

### Atualizar `api-pedidos-atualizar-status`
- Quando pedido muda para `cancelado`:
  - Verificar se foi pago com saldo (checar `wallet_transactions` com `referencia_id = order_id`)
  - Se sim: chamar `creditar_carteira` com tipo `estorno`
  - Notificar usuário

---

## 8. Menu e Rotas

### `src/components/customer/CustomerLayout.tsx`
- Adicionar item "Carteira" com ícone `Wallet` no menu

### `src/App.tsx`
- Adicionar rota `/minha-conta/carteira` → `CustomerWallet`

---

## 9. Admin

### `src/components/admin/WalletSettings.tsx`
- Configurar: valor mín/máx, taxa %, valores sugeridos, pagamento parcial
- Adicionar na tab de configurações do admin

### `src/components/admin/CustomerWalletView.tsx`
- Visualizar carteira de qualquer cliente
- Ajuste manual (crédito/débito) com motivo obrigatório
- Usar no painel de gestão de usuários

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar tabelas, enum, RLS, procedures, trigger |
| `src/hooks/useWallet.ts` | Criar |
| `src/pages/customer/CustomerWallet.tsx` | Criar |
| `src/components/wallet/AddBalanceModal.tsx` | Criar |
| `supabase/functions/wallet-recharge/index.ts` | Criar |
| `src/pages/Checkout.tsx` | Adicionar opção de pagamento com saldo |
| `src/components/customer/CustomerLayout.tsx` | Adicionar item "Carteira" |
| `src/App.tsx` | Adicionar rota `/minha-conta/carteira` |
| `src/components/admin/WalletSettings.tsx` | Criar |
| `src/pages/admin/Configuracoes.tsx` | Adicionar tab Carteira |
| `supabase/functions/api-pedidos-atualizar-status/index.ts` | Estorno automático |
| `supabase/functions/webhook-n8n-payment/index.ts` | Handler de recarga |
| `src/hooks/usePlatformSettings.ts` | Expandir interface |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

