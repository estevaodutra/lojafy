

# Unificação da Gestão de Clientes e Usuários

## Resumo

Atualmente existem duas abas separadas na página `/super-admin/clientes`:
1. **Clientes** (AdminCustomers) - Mostra profiles com estatísticas de pedidos
2. **Gestão de Usuários** (GestaoUsuarios) - Mostra usuários com roles, planos, status e lógica de limpeza

A proposta é **unificar tudo em uma única tabela** com a lógica de limpeza integrada, removendo a separação por abas mas mantendo todas as funcionalidades.

---

## Layout Proposto

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Gestão de Usuários                                                                  │
│ Gerencie todos os usuários da plataforma                          [+ Criar Usuário] │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│ ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐             │
│ │ 🟡 Serão Desativados│  │ 🔴 Serão Excluídos │  │ ⬜ Já Desativados  │             │
│ │ 30+ dias sem acesso │  │ 60+ dias sem acesso│  │ Aguardando exclusão│             │
│ │        5           │  │         2          │  │         3          │             │
│ └────────────────────┘  └────────────────────┘  └────────────────────┘             │
│                                                                                     │
│ ┌───────────────────────────────────────────────────────────────────────────────┐  │
│ │ [🔍 Buscar...]     [Role ▼]     [Plano ▼]     [Status ▼]     [Limpeza 🗑️]    │  │
│ └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│ ┌───────────────────────────────────────────────────────────────────────────────┐  │
│ │ Nome     │ Email   │ Telefone│ Role  │ Plano │ Pedidos│ Total  │ Status │ Ações │  │
│ ├──────────┼─────────┼─────────┼───────┼───────┼────────┼────────┼────────┼───────┤  │
│ │ João...  │ j@...   │ (11)... │ Client│  -    │  5     │ R$500  │ Ativo  │ 🔍 ⚡ │  │
│ │ Maria... │ m@...   │ (11)... │ Resell│Premium│  12    │ R$2.5k │ Ativo  │ 🔍 ⚡ │  │
│ │ Pedro... │ p@...   │ (11)... │ Client│  -    │  0     │ R$0    │ 20d p/ │ 🔍 ⚡ │  │
│ └───────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                     │
│ Página 1 de 5                                          [< Anterior] [Próxima >]    │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Propostas

### 1. Página Única Unificada

**Arquivo:** `src/pages/admin/Clientes.tsx`

Transformar de tabs para página única com:
- Cards de status de limpeza no topo (UserCleanupPanel)
- Filtros unificados (busca, role, plano, status)
- Botão de acesso rápido ao histórico de limpeza
- Tabela unificada com todas as informações

### 2. Tabela Unificada com Colunas

| Coluna | Origem | Descrição |
|--------|--------|-----------|
| Nome | profiles | Nome completo |
| Email | auth.users | Email de cadastro |
| Telefone | profiles | Telefone do perfil |
| Role | user_roles | Badge com tipo de usuário |
| Plano | profiles | Premium/Free (só para resellers) |
| Pedidos | orders (count) | Quantidade de pedidos |
| Total Gasto | orders (sum) | Soma dos pedidos |
| Último Acesso | auth.users | Data do último login |
| Atividade | calculated | Status de limpeza automática |
| Status | profiles + auth | Ativo/Inativo/Banido/Excluído |
| Ações | - | Ver detalhes, Alterar role, etc |

### 3. Botão de Histórico de Limpeza

Adicionar um botão que abre um modal/drawer com:
- Regras de limpeza automática
- Logs de limpeza recentes
- Botão para executar limpeza manual

---

## Estrutura de Dados Unificada

A query RPC `get_users_with_email` já retorna:
- Dados do perfil (nome, telefone, etc)
- Email do auth.users
- Role do user_roles
- Status de ban e deleted

Adicionar dados de pedidos na mesma query ou via join client-side:
- order_count
- total_spent
- last_order_date

---

## Componentes Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/admin/Clientes.tsx` | Refatorar | Remover tabs, unificar em página única |
| `src/pages/admin/GestaoUsuarios.tsx` | Manter | Exportar lógica de tabela como componente |
| `src/pages/admin/Customers.tsx` | Remover | Funcionalidade absorvida pela página unificada |
| `src/components/admin/UserCleanupPanel.tsx` | Manter | Continua exibindo cards de limpeza |
| `src/components/admin/CleanupHistoryTab.tsx` | Modificar | Transformar em modal/drawer |
| `src/components/admin/UnifiedUsersTable.tsx` | Criar | Nova tabela unificada |

---

## Fluxo de Dados

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Clientes.tsx                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ UserCleanupPanel - Cards de status de limpeza            │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Filtros + Botão Histórico Limpeza                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ UnifiedUsersTable                                        │  │
│  │ - Dados de get_users_with_email                          │  │
│  │ - Dados de pedidos por usuário                           │  │
│  │ - Modal de detalhes do cliente                           │  │
│  │ - Ações de gestão (role, status, etc)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              │                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CleanupHistoryDrawer (quando aberto)                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Funcionalidades Mantidas

### Da aba "Clientes" (AdminCustomers):
- Visualização de detalhes do cliente em modal
- Estatísticas de pedidos (quantidade, total gasto)
- Histórico de endereços e pedidos
- Badge de status baseado em última compra

### Da aba "Gestão de Usuários" (GestaoUsuarios):
- Filtros por role, plano e status
- Cards de limpeza automática (UserCleanupPanel)
- Alterar role do usuário
- Ativar/desativar usuário
- Excluir usuário
- Desbanir usuário
- Editar plano de revendedor
- Impersonar usuário
- Paginação com lógica de elipse
- Histórico de limpeza

---

## Modal de Detalhes do Cliente

Ao clicar no ícone de visualização, abre modal com:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 👤 Detalhes do Usuário                                    [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Informações Pessoais                                        │ │
│ │ Nome: João Silva                                            │ │
│ │ Email: joao@email.com                                       │ │
│ │ Telefone: (11) 99999-9999                                   │ │
│ │ CPF: ***.***.***-**                                         │ │
│ │ Cliente desde: 15/01/2024                                   │ │
│ │ Último acesso: 25/01/2026 14:30                             │ │
│ │ ID: [copy icon] abc-123-def                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📍 Endereços (2)                                            │ │
│ │ ├── Casa (Padrão)                                           │ │
│ │ │   Rua ABC, 123 - Bairro - Cidade/SP - CEP 00000-000       │ │
│ │ └── Trabalho                                                │ │
│ │     Av XYZ, 456 - Centro - Cidade/SP - CEP 11111-111        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🛒 Histórico de Pedidos (5)                                 │ │
│ │ ├── #ORD-001 - 25/01/2026 - R$ 150,00 - Entregue            │ │
│ │ ├── #ORD-002 - 20/01/2026 - R$ 89,90 - Em trânsito          │ │
│ │ └── ... e mais 3 pedido(s)                                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⚙️ Ações Administrativas                                    │ │
│ │ [Alterar Role ▼]  [Editar Plano]  [Impersonar]              │ │
│ │ [Ativar/Desativar]  [Banir/Desbanir]  [🗑️ Excluir]          │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Drawer de Histórico de Limpeza

Botão "🗑️ Limpeza" abre drawer lateral com:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Limpeza Automática de Usuários                            [X]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ ⏰ Regras de Limpeza                                        │ │
│ │ • 30 dias: Usuários sem acesso são desativados              │ │
│ │ • 60 dias: Usuários desativados são excluídos               │ │
│ │ • Proteção: Admins nunca são afetados                       │ │
│ │ • Automático: Executa às 3h da manhã                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [🔴 Executar Limpeza Agora]                                     │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📋 Logs de Limpeza                                          │ │
│ │ ├── [Excluído] joao@email.com - 65 dias - 26/01/2026        │ │
│ │ ├── [Desativado] maria@email.com - 32 dias - 26/01/2026     │ │
│ │ └── [Desativado] pedro@email.com - 31 dias - 25/01/2026     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Seção Técnica

### Query Unificada

Criar uma nova RPC ou modificar `get_users_with_email` para incluir dados de pedidos:

```sql
-- Adicionar à query existente
LEFT JOIN LATERAL (
  SELECT 
    COUNT(*) as order_count,
    COALESCE(SUM(total_amount), 0) as total_spent,
    MAX(created_at) as last_order_date
  FROM orders 
  WHERE orders.user_id = profiles.user_id
) order_stats ON true
```

### Estados do Componente Principal

```typescript
// Estados
const [searchTerm, setSearchTerm] = useState('');
const [roleFilter, setRoleFilter] = useState('all');
const [planFilter, setPlanFilter] = useState('all');
const [statusFilter, setStatusFilter] = useState('all');
const [currentPage, setCurrentPage] = useState(1);
const [selectedUser, setSelectedUser] = useState<User | null>(null);
const [showCleanupDrawer, setShowCleanupDrawer] = useState(false);
```

### Arquivos a Criar

1. `src/components/admin/UnifiedUsersTable.tsx` - Tabela principal
2. `src/components/admin/UserDetailsModal.tsx` - Modal de detalhes
3. `src/components/admin/CleanupHistoryDrawer.tsx` - Drawer de limpeza

### Arquivos a Modificar

1. `src/pages/admin/Clientes.tsx` - Refatorar para página única
2. `src/components/admin/CleanupHistoryTab.tsx` - Adaptar para drawer

### Arquivos a Remover

1. `src/pages/admin/Customers.tsx` - Funcionalidade absorvida
2. `src/pages/admin/GestaoUsuarios.tsx` - Funcionalidade absorvida

---

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 2 abas separadas | Página única unificada |
| Dados duplicados | Dados consolidados |
| 2 tabelas diferentes | 1 tabela completa |
| Navegação confusa | Fluxo simplificado |
| Modal de cliente básico | Modal completo com ações |
| Tab de limpeza | Drawer de limpeza |

