
# Plano: Separar Acesso à Plataforma do Acesso aos Cursos

## Problema Identificado

A lógica atual em `useCourseEnrollment.ts` libera automaticamente cursos com `access_level = 'all'`:

```typescript
const canAccessCourse = (courseId: string) => {
  return isEnrolled(courseId) || course?.access_level === 'all'; // ❌ Libera tudo
};
```

Como todos os cursos estão configurados com `access_level = 'all'`, qualquer usuário com acesso à plataforma consegue entrar em todos os cursos sem matrícula.

---

## Nova Arquitetura

| Camada | Controle | Função |
|--------|----------|--------|
| **Feature `lojafy_academy`** | Entrada na plataforma | Permite ver o catálogo de cursos |
| **Matrícula (`course_enrollments`)** | Acesso ao conteúdo | Permite assistir aulas |
| **`access_level` do curso** | Visibilidade no catálogo | Define quais roles podem **ver/comprar** o curso |

---

## Alterações Necessárias

### 1. Hook: `src/hooks/useCourseEnrollment.ts`

**Remover a lógica que libera cursos `access_level = 'all'`:**

```typescript
// ANTES (linha 93-96)
const canAccessCourse = (courseId: string) => {
  const course = availableCourses?.find(c => c.id === courseId);
  return isEnrolled(courseId) || course?.access_level === 'all';
};

// DEPOIS - Acesso SOMENTE via matrícula
const canAccessCourse = (courseId: string) => {
  return isEnrolled(courseId);
};
```

---

### 2. Página Academy: `src/pages/customer/Academy.tsx`

**Atualizar a UI para refletir a nova lógica:**

```text
Linha 67-68 - Remover dependência de 'isFreeForAll' para mostrar acesso
Linha 77 - Remover borda azul para cursos 'all'
Linha 108-111 - Remover badge "Acesso Livre"
```

**Nova lógica visual:**
- Matriculado → Badge verde "🎓 Matriculado" + Botão "Assistir Aulas"
- Não matriculado → Badge "🔒 Bloqueado" + Botão "Adquirir Agora" (ou botão desabilitado)

---

### 3. Campo `access_level` - Nova Interpretação

O campo `access_level` passa a significar apenas **quem pode VER o curso no catálogo**:

| Valor | Significado |
|-------|-------------|
| `all` | Visível para todos os usuários com feature Academy |
| `reseller` | Visível apenas para revendedores |
| `supplier` | Visível apenas para fornecedores |
| `customer` | Visível apenas para clientes |

**Porém, nenhum deles terá ACESSO ao conteúdo sem matrícula.**

---

## Fluxo Final

```text
┌─────────────────────────────────────────────────────────────┐
│  USUÁRIO RECEBE FEATURE "lojafy_academy"                    │
│  → Pode acessar /minha-conta/academy                        │
│  → Vê catálogo de cursos (filtrado por access_level)        │
│  → Todos os cursos aparecem como "🔒 Bloqueado"             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  USUÁRIO É MATRICULADO VIA API (api-matriculas-cadastrar)   │
│  → Curso específico aparece como "🎓 Matriculado"           │
│  → Botão "Assistir Aulas" fica habilitado                   │
│  → Pode acessar módulos e aulas do curso                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useCourseEnrollment.ts` | Simplificar `canAccessCourse` para verificar apenas matrícula |
| `src/pages/customer/Academy.tsx` | Remover lógica visual de "Acesso Livre" |
| `src/pages/customer/CourseModules.tsx` | Adicionar verificação de matrícula antes de exibir módulos |
| `src/pages/customer/ModuleLessons.tsx` | Adicionar verificação de matrícula antes de exibir aulas |
| `src/pages/customer/LessonViewer.tsx` | Adicionar verificação de matrícula antes de exibir vídeo |

---

## Opcional: Atualizar RLS do Supabase

Para garantir segurança no backend, podemos atualizar as políticas RLS das tabelas `course_modules` e `course_lessons` para remover a condição `access_level = 'all'` e exigir matrícula.

---

## Resumo

Essa alteração garante que:
1. A **feature** controla quem entra na plataforma
2. A **matrícula** controla quem acessa cada curso
3. O **access_level** controla apenas visibilidade no catálogo (opcional)
