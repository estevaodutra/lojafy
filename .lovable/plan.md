

# Criar Página Exclusiva "</> API Documentação" no Painel Super Admin

## Resumo

Criar uma nova página dedicada para documentação de API (`/super-admin/api-docs`) com:
1. Navegação lateral estilo sidebar como no exemplo (Introdução, Autenticação, categorias de endpoints)
2. Separação por abas/seções para cada tipo de integração
3. Paginação personalizada para evitar scroll longo
4. Remover a aba "Integrações" da página de Configurações

---

## Layout Proposto

```text
┌───────────────────────────────────────────────────────────────────────────────────┐
│  SUPER ADMIN SIDEBAR          │            CONTEÚDO DA PÁGINA                    │
│  ─────────────────────────    │  ─────────────────────────────────────────────── │
│  Administração                 │                                                  │
│  ├── Dashboard                 │   </> API Documentação                           │
│  ├── Catálogo                  │   ────────────────────                           │
│  ├── Pedidos                   │                                                  │
│  ├── Clientes                  │   ┌────────────────────┬──────────────────────┐ │
│  ├── Design                    │   │ NAVEGAÇÃO LATERAL  │ CONTEÚDO             │ │
│  ├── Configurações             │   │ ────────────────── │ ────────────────────  │ │
│  ├── Financeiro                │   │ ◎ Introdução       │                      │ │
│  └── </> API Docs  ← NOVO      │   │ 🔑 Autenticação    │ [Conteúdo Selecionado]│ │
│                                 │   │ 🔧 Chaves de API   │                      │ │
│  Suporte                        │   │                    │                      │ │
│  └── Chat de Suporte            │   │ ENDPOINTS          │                      │ │
│                                 │   │ ▼ Catálogo         │                      │ │
│  Academy                        │   │   POST /cadastrar  │                      │ │
│  └── Lojafy Academy             │   │   GET  /listar     │                      │ │
│                                 │   │ ▼ Pedidos          │ [Paginação]          │ │
│                                 │   │   GET  /recentes   │  < 1 2 3 4 5 >       │ │
│                                 │   │ ▼ Academy          │                      │ │
│                                 │   └────────────────────┴──────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivos a Criar

### 1. `src/pages/admin/ApiDocumentation.tsx` (Nova Página Principal)

Página com layout de duas colunas:
- **Coluna esquerda**: Navegação lateral com seções colapsáveis
- **Coluna direita**: Conteúdo da seção selecionada com paginação

Seções da navegação:
- **Introdução** - Visão geral da API
- **Autenticação** - Como autenticar
- **Chaves de API** - Gerenciamento (ApiKeyManager existente)
- **Catálogo** (colapsável)
  - POST /api-produtos-cadastrar
  - GET /api-produtos-listar
  - GET /api-produtos-aguardando-aprovacao
  - GET /api-categorias-listar
  - POST /api-categorias-cadastrar
  - GET /api-subcategorias-listar
  - POST /api-subcategorias-cadastrar
- **Pedidos** (colapsável)
  - GET /api-top-produtos
  - GET /api-pedidos-recentes
  - GET /api-pedidos-listar
- **Ranking/Demo** (colapsável)
  - POST /api-demo-pedidos-cadastrar
  - POST /api-demo-usuarios-cadastrar
  - POST /api-ranking-produto-cadastrar
- **Academy** (colapsável)
  - Usuários
  - Cursos
  - Matrículas
  - Progresso

### 2. `src/components/admin/ApiDocsSidebar.tsx` (Navegação Lateral)

Componente de sidebar com:
- Itens de menu fixos (Introdução, Autenticação, Chaves de API)
- Seções colapsáveis para cada categoria de endpoint
- Badges de método (GET, POST, PUT, DELETE) coloridos
- Estado ativo para item selecionado

### 3. `src/components/admin/ApiDocsContent.tsx` (Área de Conteúdo)

Componente que renderiza o conteúdo baseado na seção selecionada:
- Seção Introdução
- Seção Autenticação
- Seção Chaves de API (usa ApiKeyManager)
- Lista de endpoints com paginação (5 por página)

### 4. `src/components/admin/ApiDocsPagination.tsx` (Paginação Customizada)

Paginação estilizada com:
- Botões anterior/próximo
- Números de página limitados (máximo 5 visíveis)
- Elipse para páginas intermediárias
- Contagem de itens (ex: "Mostrando 1-5 de 15")

---

## Arquivos a Modificar

### 1. `src/components/layouts/SuperAdminLayout.tsx`

Adicionar novo item no menu:

```typescript
const superAdminMenuItems = [
  // ... items existentes
  {
    title: 'Financeiro',
    url: '/super-admin/financeiro',
    icon: DollarSign,
  },
  {
    title: '</> API Docs',  // ← NOVO
    url: '/super-admin/api-docs',
    icon: Code,
  },
];
```

### 2. `src/App.tsx`

Adicionar rota:

```typescript
<Route path="api-docs" element={<ApiDocumentation />} />
```

### 3. `src/pages/admin/Configuracoes.tsx`

Remover a aba "Integrações":

```typescript
// ANTES
<TabsTrigger value="integrations">Integrações</TabsTrigger>
<TabsContent value="integrations">
  <IntegracaoPage />
</TabsContent>

// DEPOIS - Remover completamente
```

---

## Estrutura de Dados para Endpoints

```typescript
interface EndpointCategory {
  id: string;
  title: string;
  icon: string;
  endpoints: EndpointData[];
}

const apiCategories: EndpointCategory[] = [
  {
    id: 'catalog',
    title: 'Catálogo',
    icon: 'Package',
    endpoints: [...] // endpoints existentes de Integracoes.tsx
  },
  {
    id: 'orders',
    title: 'Pedidos',
    icon: 'ShoppingCart',
    endpoints: [...]
  },
  {
    id: 'ranking',
    title: 'Ranking & Demo',
    icon: 'BarChart3',
    endpoints: [...]
  },
  {
    id: 'academy',
    title: 'Academy',
    icon: 'GraduationCap',
    subcategories: [
      { id: 'users', title: 'Usuários', endpoints: [...] },
      { id: 'courses', title: 'Cursos', endpoints: [...] },
      { id: 'enrollments', title: 'Matrículas', endpoints: [...] },
      { id: 'progress', title: 'Progresso', endpoints: [...] }
    ]
  }
];
```

---

## Design da Navegação Lateral

| Item | Ícone | Comportamento |
|------|-------|---------------|
| Introdução | FileText | Página estática |
| Autenticação | Key | Página estática |
| Chaves de API | Settings | ApiKeyManager |
| Catálogo | Package | Colapsável, lista endpoints |
| Pedidos | ShoppingCart | Colapsável, lista endpoints |
| Ranking & Demo | BarChart3 | Colapsável, lista endpoints |
| Academy | GraduationCap | Colapsável, com sub-categorias |

---

## Paginação Personalizada

Para evitar scroll longo, a lista de endpoints será paginada:

- **5 endpoints por página** (configurável)
- Navegação: `[<] [1] [2] [3] [...] [8] [>]`
- Mostra "Exibindo 1-5 de 23 endpoints"
- Transição suave entre páginas

```text
┌─────────────────────────────────────────────────────┐
│  Endpoints de Catálogo (7 endpoints)                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [EndpointCard 1]                                   │
│  [EndpointCard 2]                                   │
│  [EndpointCard 3]                                   │
│  [EndpointCard 4]                                   │
│  [EndpointCard 5]                                   │
│                                                     │
│  ← Anterior   [1] [2]   Próximo →                   │
│                                                     │
│  Exibindo 1-5 de 7 endpoints                        │
└─────────────────────────────────────────────────────┘
```

---

## Seção Técnica

### Estado do Componente Principal

```typescript
const [selectedSection, setSelectedSection] = useState<string>('intro');
const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
const [currentPage, setCurrentPage] = useState(1);
const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['catalog']));

const ITEMS_PER_PAGE = 5;
```

### Lógica de Paginação

```typescript
const paginatedEndpoints = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  return currentEndpoints.slice(startIndex, startIndex + ITEMS_PER_PAGE);
}, [currentEndpoints, currentPage]);

const totalPages = Math.ceil(currentEndpoints.length / ITEMS_PER_PAGE);
```

### Navegação por Categoria

```typescript
const handleCategoryClick = (categoryId: string) => {
  setExpandedCategories(prev => {
    const next = new Set(prev);
    if (next.has(categoryId)) {
      next.delete(categoryId);
    } else {
      next.add(categoryId);
    }
    return next;
  });
};

const handleEndpointClick = (categoryId: string, endpointIndex: number) => {
  setSelectedSection(categoryId);
  setSelectedEndpoint(`${categoryId}-${endpointIndex}`);
  setCurrentPage(Math.floor(endpointIndex / ITEMS_PER_PAGE) + 1);
};
```

---

## Arquivos Afetados

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/admin/ApiDocumentation.tsx` | Criar | Página principal da documentação |
| `src/components/admin/ApiDocsSidebar.tsx` | Criar | Navegação lateral |
| `src/components/admin/ApiDocsContent.tsx` | Criar | Área de conteúdo |
| `src/components/admin/ApiDocsPagination.tsx` | Criar | Paginação customizada |
| `src/components/layouts/SuperAdminLayout.tsx` | Modificar | Adicionar item ao menu |
| `src/App.tsx` | Modificar | Adicionar rota |
| `src/pages/admin/Configuracoes.tsx` | Modificar | Remover aba Integrações |

---

## Componentes Reutilizados

Os seguintes componentes existentes serão reutilizados:
- `EndpointCard` - Exibição de cada endpoint
- `ApiKeyManager` - Gerenciamento de chaves
- `CodeBlock` - Exibição de código
- `ApiTester` - Testes de requisição

