

# Adicionar Painel do Revendedor no Super Admin

## Objetivo

Permitir que o Super Admin acesse todas as funcionalidades do painel de revendedor diretamente dentro do painel de administração, sem precisar impersonar um revendedor.

## Alterações

### 1. Adicionar rotas do revendedor no Super Admin (`src/App.tsx`)

Duplicar todas as rotas do painel de revendedor dentro do bloco de rotas do Super Admin, com o prefixo `/super-admin/reseller/`:

- `/super-admin/reseller` - Dashboard do Revendedor
- `/super-admin/reseller/catalogo` - Catálogo
- `/super-admin/reseller/produtos` - Meus Produtos
- `/super-admin/reseller/pedidos` - Pedidos
- `/super-admin/reseller/loja` - Configurar Loja
- `/super-admin/reseller/paginas` - Páginas
- `/super-admin/reseller/vantagens` - Vantagens
- `/super-admin/reseller/banners` - Banners
- `/super-admin/reseller/cupons` - Cupons
- `/super-admin/reseller/frete` - Frete
- `/super-admin/reseller/depoimentos` - Depoimentos
- `/super-admin/reseller/vendas` - Vendas
- `/super-admin/reseller/relatorios` - Relatórios
- `/super-admin/reseller/clientes` - Clientes
- `/super-admin/reseller/financeiro` - Financeiro
- `/super-admin/reseller/metas` - Metas
- `/super-admin/reseller/integracoes` - Lojafy Integra
- `/super-admin/reseller/meus-acessos` - Meus Acessos
- `/super-admin/reseller/meus-acessos/top-produtos` - Top Produtos Vencedores

### 2. Adicionar menu "Painel Revendedor" na sidebar do Super Admin (`src/components/layouts/SuperAdminLayout.tsx`)

Criar uma nova seção no menu lateral chamada "Painel Revendedor" com os principais itens de navegação do revendedor, agrupados de forma simplificada:

- Dashboard (`/super-admin/reseller`)
- Catálogo (`/super-admin/reseller/catalogo`)
- Produtos (`/super-admin/reseller/produtos`)
- Pedidos (`/super-admin/reseller/pedidos`)
- Vendas (`/super-admin/reseller/vendas`)
- Configurar Loja (`/super-admin/reseller/loja`)
- Financeiro (`/super-admin/reseller/financeiro`)
- Relatórios (`/super-admin/reseller/relatorios`)

---

## Detalhes Técnicos

### Arquivo: `src/App.tsx`

Dentro do bloco `<Route path="/super-admin" ...>` (linhas 290-330), adicionar as novas rotas reutilizando os mesmos componentes de página já importados (ResellerDashboard, ResellerCatalog, etc.). Sem necessidade de novas importações pois todas já existem no arquivo.

### Arquivo: `src/components/layouts/SuperAdminLayout.tsx`

Adicionar um novo array `resellerMenuItems` com os itens de navegação e uma nova seção `<SidebarGroup>` com label "Painel Revendedor" na sidebar, usando os mesmos icones já importados (LayoutDashboard, Package, ShoppingCart, etc.). Importar icones adicionais necessarios como `ShoppingBag` e `TrendingUp`.

