
# Plano: Adicionar Nível de Acesso "Apenas Matriculados"

## Objetivo

Adicionar uma nova opção **"Apenas Matriculados"** (`enrolled_only`) ao campo `access_level` dos cursos da Lojafy Academy. 

Com este novo nível:
- O curso **não aparece** no catálogo para nenhuma role
- Só é visível para usuários que já possuem matrícula (feita via API)

---

## Arquivos Afetados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/courseAccess.ts` | Adicionar `enrolled_only` ao tipo e funções helper |
| `src/types/courses.ts` | Adicionar `enrolled_only` ao tipo `access_level` |
| `src/components/admin/CourseForm.tsx` | Adicionar opção no Select e schema Zod |
| `src/hooks/useCourseEnrollment.ts` | Filtrar cursos `enrolled_only` do catálogo geral |
| **Migração SQL** | Adicionar valor ao enum `course_access_level` |

---

## Detalhes Técnicos

### 1. Migração SQL - Adicionar valor ao ENUM

```sql
ALTER TYPE course_access_level ADD VALUE 'enrolled_only';
```

---

### 2. `src/lib/courseAccess.ts`

```typescript
// ANTES
export type CourseAccessLevel = 'all' | 'customer' | 'supplier' | 'reseller';

// DEPOIS
export type CourseAccessLevel = 'all' | 'customer' | 'supplier' | 'reseller' | 'enrolled_only';

// Atualizar labels
const labels: Record<CourseAccessLevel, string> = {
  all: 'Todos os usuários',
  customer: 'Apenas Clientes',
  supplier: 'Apenas Fornecedores',
  reseller: 'Apenas Revendedores',
  enrolled_only: 'Apenas Matriculados',  // NOVO
};

// Atualizar badges
const badges = {
  // ...existentes
  enrolled_only: { icon: '🔐', label: 'Matriculados' },  // NOVO
};
```

---

### 3. `src/types/courses.ts`

```typescript
// ANTES
access_level: 'all' | 'customer' | 'supplier' | 'reseller';

// DEPOIS
access_level: 'all' | 'customer' | 'supplier' | 'reseller' | 'enrolled_only';
```

---

### 4. `src/components/admin/CourseForm.tsx`

**Schema Zod (linha 29):**
```typescript
// ANTES
access_level: z.enum(['all', 'customer', 'supplier', 'reseller']).default('all'),

// DEPOIS
access_level: z.enum(['all', 'customer', 'supplier', 'reseller', 'enrolled_only']).default('all'),
```

**Select (linhas 297-302):**
```tsx
<SelectContent>
  <SelectItem value="all">🌐 Todos os usuários</SelectItem>
  <SelectItem value="customer">👤 Apenas Clientes</SelectItem>
  <SelectItem value="supplier">📦 Apenas Fornecedores</SelectItem>
  <SelectItem value="reseller">🏪 Apenas Revendedores</SelectItem>
  <SelectItem value="enrolled_only">🔐 Apenas Matriculados</SelectItem>  {/* NOVO */}
</SelectContent>
```

**Atualizar descrição (linha 304-306):**
```tsx
<p className="text-sm text-muted-foreground">
  Define quem pode ver este curso no catálogo. "Apenas Matriculados" oculta o curso do catálogo.
</p>
```

---

### 5. `src/hooks/useCourseEnrollment.ts`

**Atualizar query de cursos disponíveis (linhas 67-87):**

```typescript
const { data: availableCourses, isLoading: coursesLoading } = useQuery({
  queryKey: ['available-courses', role, enrollments],
  queryFn: async () => {
    let query = supabase
      .from('courses')
      .select('*')
      .eq('is_published', true)
      .order('position', { ascending: true });
    
    // Excluir cursos "enrolled_only" da query inicial
    // Estes serão adicionados separadamente se o usuário tiver matrícula
    if (role && role !== 'super_admin') {
      query = query
        .or(`access_level.eq.all,access_level.eq.${role}`)
        .neq('access_level', 'enrolled_only');
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Adicionar cursos enrolled_only que o usuário já está matriculado
    const enrolledCourseIds = enrollments?.map(e => e.course_id) || [];
    if (enrolledCourseIds.length > 0) {
      const { data: enrolledOnlyCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('is_published', true)
        .eq('access_level', 'enrolled_only')
        .in('id', enrolledCourseIds);
      
      if (enrolledOnlyCourses) {
        return [...(data || []), ...enrolledOnlyCourses] as Course[];
      }
    }
    
    return data as Course[];
  },
  enabled: !!role,
});
```

---

## Fluxo de Visibilidade

| access_level | Quem vê no catálogo | Quem acessa conteúdo |
|--------------|---------------------|----------------------|
| `all` | Todos com feature Academy | Apenas matriculados |
| `customer` | Clientes com feature | Apenas matriculados |
| `supplier` | Fornecedores com feature | Apenas matriculados |
| `reseller` | Revendedores com feature | Apenas matriculados |
| `enrolled_only` | **Ninguém** (oculto) | Apenas matriculados |

---

## Caso de Uso

Cursos **"Apenas Matriculados"** são ideais para:
- Cursos VIP/exclusivos
- Bônus de campanhas
- Conteúdos personalizados por usuário
- Treinamentos internos

O admin cria o curso, configura como `enrolled_only`, e depois matricula usuários específicos via API (`api-matriculas-cadastrar`). Esses usuários verão o curso no catálogo deles, mas outros usuários não.
