

# Plano: Criar Categoria "Usuários" Separada na Documentação API

## Contexto

Atualmente, os endpoints de usuários estão dentro da categoria **Academy** como subcategoria. A mudança é extrair esses endpoints para uma **categoria principal** independente.

---

## Estrutura Atual

```text
├── Catálogo
├── Pedidos  
├── Ranking & Demo
├── Features
└── Academy
    ├── Usuários      <-- Aninhado dentro de Academy
    ├── Cursos
    ├── Matrículas
    └── Progresso
```

---

## Nova Estrutura

```text
├── Catálogo
├── Pedidos
├── Ranking & Demo
├── Usuários          <-- Nova categoria principal
├── Features
└── Academy
    ├── Cursos
    ├── Matrículas
    └── Progresso
```

---

## Alterações no Arquivo

### Arquivo: `src/data/apiEndpointsData.ts`

### 1. Renomear o array de endpoints

| De | Para |
|----|------|
| `academyUserEndpoints` | `usersEndpoints` |

### 2. Adicionar nova categoria no export

```typescript
export const apiEndpointsData: EndpointCategory[] = [
  {
    id: 'catalog',
    title: 'Catálogo',
    endpoints: catalogEndpoints
  },
  {
    id: 'orders',
    title: 'Pedidos',
    endpoints: ordersEndpoints
  },
  {
    id: 'ranking',
    title: 'Ranking & Demo',
    endpoints: rankingEndpoints
  },
  // NOVA CATEGORIA
  {
    id: 'users',
    title: 'Usuários',
    endpoints: usersEndpoints
  },
  {
    id: 'features',
    title: 'Features',
    endpoints: featuresEndpoints
  },
  {
    id: 'academy',
    title: 'Academy',
    subcategories: [
      // REMOVIDO: { id: 'academy-users', title: 'Usuários', endpoints: ... }
      { id: 'academy-courses', title: 'Cursos', endpoints: academyCourseEndpoints },
      { id: 'academy-enrollments', title: 'Matrículas', endpoints: academyEnrollmentEndpoints },
      { id: 'academy-progress', title: 'Progresso', endpoints: academyProgressEndpoints }
    ]
  }
];
```

---

## Endpoints da Categoria "Usuários"

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| Verificar Usuário | GET | Verifica se usuário existe |
| Cadastrar Usuário | POST | Cria novo usuário |
| Listar Usuários | GET | Lista todos com filtros |
| Alterar Role | POST | Altera função do usuário |

---

## Ordem Final das Categorias

1. **Catálogo** - Produtos, Categorias, Subcategorias
2. **Pedidos** - Top produtos, Pedidos recentes, Lista de pedidos
3. **Ranking & Demo** - Dados demo e ranking
4. **Usuários** - Gestão de usuários (nova posição)
5. **Features** - Gestão de funcionalidades
6. **Academy** - Cursos, Matrículas, Progresso (sem subcategoria Usuários)

---

## Resumo de Modificações

| Local | Ação |
|-------|------|
| Linha ~248 | Renomear `academyUserEndpoints` para `usersEndpoints` |
| Linha ~559 | Adicionar categoria `users` antes de `features` |
| Linha ~584 | Remover `academy-users` das subcategorias de Academy |

