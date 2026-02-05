

# Plano: Gerenciar Cursos Matriculados na Feature Lojafy Academy

## Resumo

Adicionar área expansível na feature `lojafy_academy` dentro de `UserFeaturesSection` para gerenciar as matrículas do usuário em cursos da Academy.

---

## Estrutura Existente (Reutilizar)

**Não é necessário criar novas tabelas.** O sistema já possui:

| Tabela Existente | Uso |
|------------------|-----|
| `courses` | Lista de cursos com `id`, `title`, `is_published`, etc. |
| `course_enrollments` | Matrículas com `user_id`, `course_id`, `progress_percentage`, etc. |

---

## Alterações

### 1. Novo Componente: `UserCoursesSection.tsx`

**Localização:** `src/components/admin/UserCoursesSection.tsx`

**Responsabilidades:**
- Exibir lista de cursos matriculados do usuário
- Permitir adicionar novas matrículas
- Permitir remover matrículas com confirmação

**Query para buscar matrículas:**
```typescript
const { data: enrollments } = await supabase
  .from('course_enrollments')
  .select(`
    id,
    course_id,
    progress_percentage,
    enrolled_at,
    completed_at,
    course:courses (id, title, thumbnail_url)
  `)
  .eq('user_id', userId)
  .order('enrolled_at', { ascending: false });
```

**Query para cursos disponíveis (não matriculados):**
```typescript
const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];

const { data: availableCourses } = await supabase
  .from('courses')
  .select('id, title')
  .eq('is_published', true)
  .not('id', 'in', `(${enrolledCourseIds.join(',')})`)
  .order('title');
```

---

### 2. Modificar: `UserFeaturesSection.tsx`

**Adicionar estado de expansão:**
```typescript
const [expandedFeature, setExpandedFeature] = useState<string | null>(null);
```

**Modificar renderização da feature:**
- Adicionar ícone de seta (ChevronDown/ChevronUp) quando `slug === 'lojafy_academy'`
- Ao clicar na seta, alternar `expandedFeature`
- Quando expandida, renderizar `<UserCoursesSection userId={userId} />`

**Layout da feature expandida:**
```
┌────────────────────────────────────────────────┐
│ 🎓 Lojafy Academy                         [▲] │
│    Vitalício [ativo]                       ✕  │
│                                               │
│ ┌───────────────────────────────────────────┐ │
│ │ Cursos Matriculados (2)     [+ Adicionar] │ │
│ ├───────────────────────────────────────────┤ │
│ │ 📚 LUCRANDO NO MERCADO LIVRE              │ │
│ │    Progresso: 45%                    [✕]  │ │
│ │                                           │ │
│ │ 📚 LUCRANDO NA SHOPEE                     │ │
│ │    Progresso: 0%                     [✕]  │ │
│ └───────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

---

### 3. Novo Componente: `AddCourseModal.tsx`

**Localização:** `src/components/admin/AddCourseModal.tsx`

**Props:**
```typescript
interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  excludeCourseIds: string[];
  onSuccess: () => void;
}
```

**Layout:**
```
┌─────────────────────────────────────┐
│ Adicionar Curso                  ✕ │
├─────────────────────────────────────┤
│                                     │
│ Selecione os cursos:                │
│                                     │
│ ☐ LUCRANDO NO MERCADO LIVRE         │
│ ☐ LUCRANDO NA SHOPEE                │
│ ☐ Lojafy                            │
│                                     │
│ Se nenhum disponível:               │
│ "Usuário já matriculado em todos"   │
│                                     │
├─────────────────────────────────────┤
│       [Cancelar]    [Adicionar]     │
└─────────────────────────────────────┘
```

**Inserção no banco:**
```typescript
const enrollments = selectedCourses.map(courseId => ({
  user_id: userId,
  course_id: courseId,
  progress_percentage: 0,
}));

await supabase.from('course_enrollments').insert(enrollments);
```

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/admin/UserCoursesSection.tsx` | Lista de cursos do usuário com ações |
| `src/components/admin/AddCourseModal.tsx` | Modal para adicionar cursos |

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/UserFeaturesSection.tsx` | Adicionar lógica de expansão e renderizar `UserCoursesSection` para `lojafy_academy` |

---

## Fluxos

### Adicionar Curso
1. Clicar em "+ Adicionar"
2. Modal abre com checkboxes dos cursos disponíveis
3. Selecionar cursos desejados
4. Clicar em "Adicionar"
5. Inserir em `course_enrollments`
6. Toast: "Curso(s) adicionado(s) com sucesso"
7. Atualizar lista

### Remover Curso
1. Clicar no ✕ do curso
2. AlertDialog: "Remover matrícula do curso [Nome]?"
3. Confirmar
4. Deletar de `course_enrollments`
5. Toast: "Matrícula removida com sucesso"
6. Atualizar lista

---

## Estados

| Estado | Comportamento |
|--------|---------------|
| Feature colapsada | Mostrar só linha da feature com ▼ |
| Feature expandida | Mostrar área de cursos com ▲ |
| Carregando cursos | Skeleton na área de cursos |
| Sem cursos | Texto "Nenhum curso matriculado" |
| Todos matriculados | No modal: "Já matriculado em todos" |

---

## Componentes Visuais

**Item de curso matriculado:**
```tsx
<div className="flex items-center justify-between p-2 border rounded">
  <div className="flex items-center gap-2">
    <BookOpen className="w-4 h-4 text-muted-foreground" />
    <div>
      <p className="text-sm font-medium">{course.title}</p>
      <div className="flex items-center gap-2">
        <Progress value={progress} className="h-1.5 w-20" />
        <span className="text-xs text-muted-foreground">{progress}%</span>
        {completed && <Badge variant="success" className="text-xs">Concluído</Badge>}
      </div>
    </div>
  </div>
  <Button variant="ghost" size="sm" onClick={handleRemove}>
    <X className="w-4 h-4" />
  </Button>
</div>
```

---

## Mensagens

| Ação | Mensagem |
|------|----------|
| Sucesso ao adicionar | "Curso(s) adicionado(s) com sucesso" |
| Sucesso ao remover | "Matrícula removida com sucesso" |
| Erro genérico | "Erro ao atualizar cursos. Tente novamente." |

---

## Imports Adicionais em UserFeaturesSection

```typescript
import { ChevronDown, ChevronUp } from 'lucide-react';
import { UserCoursesSection } from './UserCoursesSection';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
```

