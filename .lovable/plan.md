

# Adicionar Abas no Modal de Detalhes do Usuário

## Resumo
Reorganizar o `UserDetailsModal` para usar abas (Geral, Pedidos, Carteira, Features) abaixo das Informações Pessoais, com funcionalidades expandidas de pedidos e carteira.

## Arquivos a criar/editar

| Arquivo | Ação |
|---------|------|
| `src/components/admin/UserDetailsModal.tsx` | Refatorar: manter info pessoal no topo, adicionar Tabs abaixo |
| `src/components/admin/UserOrdersTab.tsx` | **Criar**: lista de pedidos com filtros, busca, paginação |
| `src/components/admin/UserWalletTab.tsx` | **Criar**: saldo, totais, histórico de transações, botão ajuste |
| `src/components/admin/AdminWalletAdjustModal.tsx` | **Criar**: modal crédito/débito manual com motivo obrigatório |

## Detalhes

### 1. UserDetailsModal.tsx
- Manter Card "Informações Pessoais" fixo no topo
- Substituir as seções empilhadas (Endereços, Pedidos, Features) por `<Tabs>` do Radix
- Aba **Geral**: conteúdo atual de endereços
- Aba **Pedidos**: componente `UserOrdersTab`
- Aba **Carteira**: componente `UserWalletTab`
- Aba **Features**: componente `UserFeaturesSection` existente
- Remover fetch de orders do modal (movido para UserOrdersTab)

### 2. UserOrdersTab.tsx
- Query `orders` filtrada por `user_id`
- Filtro por status (select com os 15 status novos via `ORDER_STATUS_CONFIG`)
- Busca por `order_number`
- Paginação "Carregar mais" (10 por vez)
- Card de pedido: número, data, status badge, itens count, valor, botão "Ver Pedido"

### 3. UserWalletTab.tsx
- Buscar wallet do usuário via `wallets` table
- Card de saldo com valor disponível
- Listar `wallet_transactions` paginado (20 por vez)
- Cada transação: ícone por tipo, descrição, valor com cor (verde/vermelho), data
- Botão "+ Adicionar Saldo" abre `AdminWalletAdjustModal`

### 4. AdminWalletAdjustModal.tsx
- Radio: Crédito ou Débito
- Input valor
- Input motivo (obrigatório)
- Checkbox "Cobrar taxa" (só para crédito)
- Preview do novo saldo
- Validação: débito não pode exceder saldo
- Executa via `creditar_carteira` ou `debitar_carteira` stored procedures
- Tipo transação: `ajuste_credito` ou `ajuste_debito`

### Sem migração SQL necessária
As stored procedures `creditar_carteira` e `debitar_carteira` já existem. As tabelas `wallets` e `wallet_transactions` já existem.

