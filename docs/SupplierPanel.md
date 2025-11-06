# Painel do Fornecedor - Documentação

## Visão Geral

O painel do fornecedor foi implementado para permitir que fornecedores gerenciem seus próprios produtos e visualizem pedidos que contenham seus produtos.

## Funcionalidades Implementadas

### 1. Dashboard
**Rota:** `/supplier`

Exibe métricas em tempo real:
- **Produtos Ativos**: Total de produtos ativos vs total de produtos
- **Pedidos do Mês**: Quantidade de pedidos com produtos do fornecedor
- **Receita do Mês**: Valor total das vendas dos produtos do fornecedor
- **Estoque Baixo**: Produtos com estoque ≤ 5 unidades

### 2. Gestão de Produtos
**Rota:** `/supplier/produtos`

Permite ao fornecedor:
- ✅ Ver apenas seus próprios produtos
- ✅ Criar novos produtos (supplier_id é automaticamente definido)
- ✅ Editar produtos próprios
- ✅ Deletar produtos próprios
- ✅ Duplicar produtos
- ✅ Filtrar por:
  - Todos os produtos
  - Produtos com estoque baixo
  - Produtos sem estoque

**Restrições de Segurança (RLS):**
- Fornecedores só podem ver produtos onde `supplier_id = auth.uid()`
- Fornecedores só podem editar/deletar seus próprios produtos
- Ao criar produto, `supplier_id` é automaticamente definido

### 3. Gestão de Pedidos
**Rota:** `/supplier/pedidos`

Permite ao fornecedor:
- ✅ Ver pedidos que contêm seus produtos
- ✅ Visualizar apenas os itens do pedido que são seus produtos
- ✅ Ver valor total dos seus produtos em cada pedido
- ✅ Filtrar pedidos por status
- ✅ Buscar por número de pedido ou cliente
- ✅ Ver detalhes completos do pedido

**Nota Importante:**
- O fornecedor vê o pedido completo mas com destaque para seus produtos
- O cálculo de "Valor (Meus Produtos)" mostra apenas o valor dos itens do fornecedor

### 4. Controle de Estoque
**Rota:** `/supplier/estoque`

**Status:** Mantido com dados mock (para implementação futura)

Funcionalidades planejadas:
- Ajuste manual de estoque
- Histórico de movimentações
- Alertas de estoque baixo

### 5. Vendas
**Rota:** `/supplier/vendas`

**Status:** Mantido com dados mock (para implementação futura)

Funcionalidades planejadas:
- Vendas detalhadas por período
- Comissões calculadas
- Top produtos do fornecedor
- Metas de vendas

## Estrutura Técnica

### Hooks Criados

#### `useSupplierProducts`
```typescript
// Busca produtos do fornecedor
const { data: products, isLoading, refetch } = useSupplierProducts();
```

#### `useSupplierProductStats`
```typescript
// Estatísticas dos produtos
const { data: stats } = useSupplierProductStats();
// Retorna: { total, active, lowStock, outOfStock }
```

#### `useSupplierOrders`
```typescript
// Busca pedidos com produtos do fornecedor
const { data: orders, isLoading } = useSupplierOrders();
```

#### `useSupplierOrderStats`
```typescript
// Estatísticas de pedidos do mês
const { data: orderStats } = useSupplierOrderStats();
// Retorna: { totalOrders, totalRevenue, totalItems }
```

### RLS Policies Criadas

```sql
-- Produtos
CREATE POLICY "Suppliers can view their own products"
CREATE POLICY "Suppliers can insert their own products"
CREATE POLICY "Suppliers can update their own products"
CREATE POLICY "Suppliers can delete their own products"

-- Pedidos
CREATE POLICY "Suppliers can view orders with their products"

-- Itens do Pedido
CREATE POLICY "Suppliers can view their order items"
```

### Componentes Reutilizados

O painel do fornecedor reutiliza componentes do admin:
- `ProductTable` - Tabela de produtos
- `ProductForm` - Formulário de produtos
- `OrderDetailsModal` - Modal de detalhes do pedido

## Segurança

### Validações Implementadas

1. **Nível de Banco de Dados (RLS)**
   - Fornecedor só acessa produtos onde `supplier_id = auth.uid()`
   - Pedidos são filtrados por JOIN com products e order_items
   - Impossível acessar dados de outros fornecedores

2. **Nível de Aplicação**
   - Rotas protegidas com `RoleBasedRoute` permitindo apenas role 'supplier'
   - `supplier_id` é automaticamente definido ao criar produtos
   - Hooks filtram dados baseados em `auth.uid()`

3. **Campos Automáticos**
   - `supplier_id`: Sempre preenchido com `auth.uid()` na criação
   - Fornecedor não pode alterar `supplier_id` após criação
   - Fornecedor não pode transferir produto para outro fornecedor

## Diferenças entre Super Admin e Supplier

| Funcionalidade | Super Admin | Supplier |
|---------------|-------------|----------|
| Ver todos os produtos | ✅ | ❌ (apenas próprios) |
| Ver todos os pedidos | ✅ | ❌ (apenas com seus produtos) |
| Editar qualquer produto | ✅ | ❌ (apenas próprios) |
| Deletar qualquer produto | ✅ | ❌ (apenas próprios) |
| Gerenciar categorias | ✅ | ❌ (apenas visualizar) |
| Configurar plataforma | ✅ | ❌ |
| Aprovar outros suppliers | ✅ | ❌ |

## Como Testar

### 1. Criar Usuário Supplier
```sql
-- No Supabase SQL Editor
INSERT INTO profiles (user_id, first_name, last_name, role)
VALUES (
  'uuid-do-usuario',
  'Nome',
  'Sobrenome',
  'supplier'::app_role
);
```

### 2. Testar Funcionalidades

1. **Login como supplier**
2. **Dashboard**: Verificar métricas em tempo real
3. **Produtos**: 
   - Criar novo produto (verificar que supplier_id é auto-preenchido)
   - Editar produto próprio
   - Tentar acessar produto de outro supplier (deve falhar)
4. **Pedidos**: 
   - Ver apenas pedidos com seus produtos
   - Verificar que valor mostrado é apenas dos seus itens

## Próximos Passos

### Funcionalidades Pendentes

1. **Estoque (Inventory)**
   - Implementar ajuste manual de estoque
   - Histórico de movimentações
   - Integração com sistema de alertas

2. **Vendas (Sales)**
   - Implementar relatórios detalhados
   - Cálculo de comissões
   - Sistema de metas

3. **Notificações**
   - Notificar supplier sobre novos pedidos
   - Alertas de estoque baixo
   - Notificações de aprovação de produtos (se aplicável)

4. **Relatórios**
   - Exportação de dados
   - Gráficos de vendas
   - Análise de performance

## Avisos de Segurança

⚠️ **Avisos do Linter detectados (não relacionados à implementação)**:
1. Function Search Path Mutable
2. Leaked Password Protection Disabled

Estes avisos são gerais do projeto e não foram introduzidos pela implementação do painel do fornecedor.

## Arquivos Criados/Modificados

### Criados
- `src/hooks/useSupplierProducts.ts`
- `src/hooks/useSupplierOrders.ts`
- `src/pages/supplier/ProductManagement.tsx`
- `src/pages/supplier/OrderManagement.tsx`
- `docs/SupplierPanel.md`

### Modificados
- `src/pages/supplier/Dashboard.tsx` - Atualizado com dados reais
- `src/components/layouts/SupplierLayout.tsx` - Menu atualizado
- `src/App.tsx` - Rotas atualizadas
- Migration SQL - RLS policies para supplier

### Deletados
- `src/pages/supplier/Products.tsx` - Substituído por ProductManagement.tsx
