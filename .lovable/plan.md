

# Plano: Sistema de Planos da Plataforma

Este e um recurso grande que sera implementado em fases. Abaixo esta o plano completo para a **Fase 1** — a fundacao do sistema de planos com banco de dados, interface de gestao de planos e atribuicao a usuarios.

---

## Fase 1: Banco de Dados + Interface de Gestao de Planos

### 1. Migracao SQL

Criar tabelas `plans` e `plan_features`, e adicionar campos de plano em `profiles`:

```text
plans
├── id (UUID PK)
├── nome (VARCHAR)
├── slug (VARCHAR UNIQUE)
├── descricao (TEXT)
├── preco_mensal (DECIMAL)
├── preco_anual (DECIMAL)
├── preco_vitalicio (DECIMAL)
├── cor (VARCHAR)
├── icone (VARCHAR)
├── destaque (BOOLEAN)
├── ativo (BOOLEAN DEFAULT true)
├── ordem (INTEGER DEFAULT 0)
├── created_at / updated_at

plan_features
├── id (UUID PK)
├── plan_id (FK → plans)
├── feature_id (FK → features)
├── limites (JSONB DEFAULT '{}')
├── created_at
└── UNIQUE(plan_id, feature_id)

profiles (alteracao)
├── plan_id (FK → plans, nullable)
├── plan_started_at (TIMESTAMPTZ)
├── plan_expires_at (TIMESTAMPTZ)
├── plan_type (VARCHAR) -- mensal, anual, vitalicio
```

RLS: Leitura publica para `plans` e `plan_features` (usuarios precisam ver seu plano). Escrita restrita a super_admin.

Funcoes auxiliares:
- `get_plan_feature_count(plan_id)` — conta features de um plano
- `get_plan_user_count(plan_id)` — conta usuarios em um plano
- `assign_plan_to_user(user_id, plan_id, plan_type, motivo)` — atribui plano e sincroniza user_features

### 2. Edge Function: `atribuir-plano`

Nova Edge Function que:
1. Valida que o caller e super_admin
2. Recebe `user_id`, `plan_id`, `plan_type` (mensal/anual/vitalicio), `motivo`
3. Atualiza `profiles.plan_id`, `plan_started_at`, `plan_expires_at`, `plan_type`
4. Remove user_features antigas que nao estao no novo plano
5. Insere user_features do novo plano (com limites do plan_features)
6. Registra em `feature_transactions`
7. Dispara webhook para n8n com payload do plano

### 3. Menu do Super Admin

Adicionar item "Planos" no `SuperAdminLayout.tsx` entre "Features" e "API Docs":
```text
├── Features
├── Planos  ← NOVO (icone: CreditCard)
├── API Docs
```

### 4. Rota

Adicionar em `App.tsx`:
```text
<Route path="planos" element={<Planos />} />
```

### 5. Pagina `/super-admin/planos`

**Arquivo**: `src/pages/admin/Planos.tsx`

- Header com titulo + botao "Novo Plano"
- Grid de cards (um por plano) mostrando: icone, nome, preco mensal, qtd features, qtd usuarios, status ativo/inativo, badge "Recomendado"
- Menu de acoes por card: Editar, Gerenciar Features, Duplicar, Ativar/Desativar

### 6. Modal: Criar/Editar Plano

**Arquivo**: `src/components/admin/PlanFormModal.tsx`

Campos: nome, slug (auto-gerado), descricao, 3 precos, cor, icone, destaque, ativo.

### 7. Modal: Gerenciar Features do Plano

**Arquivo**: `src/components/admin/PlanFeaturesModal.tsx`

- Lista todas as features ativas com checkboxes
- Botao de engrenagem para configurar limites (JSONB) por feature
- Salva em `plan_features`

### 8. Modal: Configurar Limites

**Arquivo**: `src/components/admin/PlanFeatureLimitsModal.tsx`

Renderiza campos dinamicos baseado na feature selecionada. Para a Fase 1, o campo `limites` sera um editor JSON simplificado. Formularios especificos por feature serao implementados na Fase 2.

### 9. Hooks

- `src/hooks/usePlans.ts` — CRUD de planos, listagem, metricas
- `src/hooks/usePlanFeatures.ts` — gerenciar features de um plano

### 10. Alteracao na Gestao de Usuarios

Na pagina de detalhes do usuario (Clientes), adicionar secao "Plano do Usuario" com:
- Plano atual, data inicio, expiracao, tipo
- Botao "Alterar Plano" que abre modal com select de plano + periodo + motivo

---

## Fase 2 (futura): Verificacao de Limites + Interface do Usuario

- Alterar `useFeature` para verificar via plano
- Criar `usePlanLimits` para consultar limites
- Indicadores de uso na interface do usuario
- Modal de limite atingido
- Formularios especificos de limites por feature
- Migracao de usuarios existentes

---

## Arquivos a criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/admin/Planos.tsx` | Pagina principal de planos |
| `src/components/admin/PlanFormModal.tsx` | Modal criar/editar plano |
| `src/components/admin/PlanFeaturesModal.tsx` | Modal gerenciar features |
| `src/components/admin/PlanFeatureLimitsModal.tsx` | Modal limites por feature |
| `src/components/admin/PlanCard.tsx` | Card visual do plano |
| `src/hooks/usePlans.ts` | Hook CRUD planos |
| `src/hooks/usePlanFeatures.ts` | Hook features do plano |
| `supabase/functions/atribuir-plano/index.ts` | Edge Function atribuicao |

## Arquivos a editar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/layouts/SuperAdminLayout.tsx` | Adicionar item "Planos" no menu |
| `src/App.tsx` | Adicionar rota `/super-admin/planos` |

## Migracao SQL

- Criar tabela `plans`
- Criar tabela `plan_features`
- Adicionar colunas `plan_id`, `plan_started_at`, `plan_expires_at`, `plan_type` em `profiles`
- Criar funcoes RPC auxiliares
- Criar RLS policies
- Inserir planos iniciais (Gratuito, Basico, Premium, VIP) com features vinculadas

