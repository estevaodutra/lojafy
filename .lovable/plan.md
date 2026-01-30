

# Plano: Listagem de Matrículas com Paginacao na Lojafy Academy

## Objetivo

Criar uma listagem completa de todas as matriculas na aba "Matriculas" do painel Super Admin da Lojafy Academy, exibindo:
- Todos os usuarios matriculados
- Quais cursos estao matriculados
- Botao de acao para desmatricular

## Estado Atual

A aba "Matriculas" em `/super-admin/academy` atualmente mostra apenas uma mensagem estatica:
```
"Selecione um curso na aba 'Cursos' para gerenciar suas matriculas"
```

## Nova Implementacao

### Componente: `AllEnrollmentsTable.tsx`

Criar um novo componente que exiba uma tabela paginada com todas as matriculas do sistema.

**Colunas da Tabela:**
| Coluna | Descricao |
|--------|-----------|
| Aluno | Nome completo (first_name + last_name) |
| Curso | Titulo do curso |
| Tipo | Badge com role do usuario (Cliente/Revendedor/Fornecedor) |
| Data de Matricula | Data formatada (dd/mm/yyyy) |
| Progresso | Barra de progresso + percentual |
| Status | Badge (Concluido/Em Progresso) |
| Acoes | Botao de desmatricular com confirmacao |

**Funcionalidades:**
- Paginacao com 20 itens por pagina (mesmo padrao usado em Clientes.tsx)
- Campo de busca por nome do aluno ou titulo do curso
- Filtro por curso (select com todos os cursos)
- Confirmacao antes de desmatricular (AlertDialog)

### Arquivos Afetados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/admin/AllEnrollmentsTable.tsx` | **NOVO** - Componente com tabela paginada |
| `src/pages/admin/Academy.tsx` | Substituir conteudo estatico pelo novo componente |

## Detalhes Tecnicos

### 1. Query de Dados

```typescript
const { data, count } = await supabase
  .from('course_enrollments')
  .select(`
    *,
    profiles:user_id (first_name, last_name, role),
    course:courses (id, title)
  `, { count: 'exact' })
  .order('enrolled_at', { ascending: false })
  .range(offset, offset + limit - 1);
```

### 2. Estrutura do Componente

```text
src/components/admin/AllEnrollmentsTable.tsx
├── Filtros (Busca + Select de Curso)
├── Card com Tabela
│   ├── TableHeader (Aluno, Curso, Tipo, Data, Progresso, Status, Acoes)
│   └── TableBody (linhas de matriculas)
├── Paginacao (mesmo estilo de UnifiedUsersTable)
└── AlertDialog de confirmacao para desmatricula
```

### 3. Estados

```typescript
const [searchTerm, setSearchTerm] = useState('');
const [courseFilter, setCourseFilter] = useState('all');
const [currentPage, setCurrentPage] = useState(1);
const [deletingEnrollment, setDeletingEnrollment] = useState<Enrollment | null>(null);
```

### 4. Paginacao

Seguir o padrao ja usado em `UnifiedUsersTable`:
- Componentes de `@/components/ui/pagination`
- Exibir "Mostrando X-Y de Z matriculas"
- Botoes Previous/Next com ellipsis quando necessario

### 5. Integracao no Academy.tsx

```tsx
<TabsContent value="enrollments" className="space-y-4">
  <AllEnrollmentsTable />
</TabsContent>
```

## Fluxo de Desmatricula

```text
1. Usuario clica no icone de lixeira
2. Abre AlertDialog de confirmacao
3. Usuario confirma
4. Chamada supabase.from('course_enrollments').delete()
5. Toast de sucesso/erro
6. Invalidar query para atualizar lista
```

## Resultado Esperado

A aba "Matriculas" exibira uma tabela completa com:
- Todos os 172+ registros de matriculas
- Navegacao por paginas (20 por pagina)
- Filtros para busca rapida
- Acao de desmatricula com confirmacao

