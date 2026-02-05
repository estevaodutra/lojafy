

# Plano: Link de Cadastro Premium Automático

## Objetivo

Criar uma nova rota `/auth/premium` que permite o cadastro de usuários com configuração automática de:
- **Role**: reseller
- **Plano**: premium  
- **Features**: todas as funcionalidades
- **Cursos**: matrícula em todos os cursos publicados
- **Onboarding**: redireciona para trilha de primeiro acesso
- **Expiração**: configurável via parâmetro `validity` (ofuscado)

---

## Fluxo da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│  Usuário acessa: /auth/premium?validity=12                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Página de CADASTRO (sem opção de login)                    │
│  - Nome, email, telefone, senha                             │
└─────────────────────────┬───────────────────────────────────┘
                          │ Submit
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Edge Function: create-premium-reseller                     │
│  1. Criar usuário no Auth                                   │
│  2. Atualizar profile (role=reseller, plan=premium)         │
│  3. Atribuir ALL features                                   │
│  4. Matricular em TODOS cursos                              │
│  5. Retornar sessão                                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Redireciona para /reseller/first-access                    │
│  (Trilha de onboarding: senha → vídeo → PWA)                │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/AuthPremium.tsx` | **Criar** | Página de cadastro premium (SEM login) |
| `supabase/functions/create-premium-reseller/index.ts` | **Criar** | Edge Function que faz todo o setup |
| `supabase/config.toml` | **Editar** | Registrar nova função |
| `src/App.tsx` | **Editar** | Adicionar rota `/auth/premium` |

---

## Detalhes da Implementação

### 1. Nova Página: `src/pages/AuthPremium.tsx`

Página de **CADASTRO DIRETO** (sem tabs, sem opção de login):
- Parâmetro `validity` lido da URL (nome ofuscado)
- Default: 1 mês se não informado
- Formulário simples: nome, email, telefone, senha, confirmar senha
- Validação de WhatsApp via webhook existente
- Chamada à Edge Function `create-premium-reseller`
- Redirecionamento automático para `/reseller/first-access`

### 2. Nova Edge Function: `create-premium-reseller`

**Processo interno:**
1. Criar usuário no `auth.users` com `email_confirm: true`
2. Atualizar `profiles`:
   - `role = 'reseller'`
   - `subscription_plan = 'premium'`
   - `subscription_expires_at = now + X meses` (ou null se vitalício)
3. Buscar todas as features ativas e inserir em `user_features`
4. Buscar todos os cursos publicados e inserir em `course_enrollments`
5. Gerar sessão e retornar tokens de autenticação

### 3. Atualização do `supabase/config.toml`

Registrar a função com `verify_jwt = false` (é para cadastro público).

### 4. Atualização do `src/App.tsx`

Adicionar rota `/auth/premium` apontando para `AuthPremium`.

---

## Parâmetros da URL (Ofuscado)

| Parâmetro | Tipo | Default | Descrição |
|-----------|------|---------|-----------|
| `validity` | number | 1 | Quantidade de meses de acesso. Use `0` para vitalício. |

**Exemplos de uso:**
- `https://lojafy.lovable.app/auth/premium` → 1 mês
- `https://lojafy.lovable.app/auth/premium?validity=6` → 6 meses
- `https://lojafy.lovable.app/auth/premium?validity=12` → 1 ano
- `https://lojafy.lovable.app/auth/premium?validity=0` → vitalício

---

## Segurança

- Parâmetro `validity` não revela propósito (evita manipulação óbvia)
- A Edge Function NÃO requer autenticação prévia
- Validação de WhatsApp antes de criar usuário
- Email único (validação existente)

---

## Resumo das Ações

1. Criar página `AuthPremium.tsx` com formulário de cadastro DIRETO
2. Criar Edge Function `create-premium-reseller` com lógica completa
3. Registrar função no `config.toml`
4. Adicionar rota no `App.tsx`

