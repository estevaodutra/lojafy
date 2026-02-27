

# Diagnostico: "Aula não encontrada" ao clicar em "Assistir Aula"

## Causa raiz identificada

O `useLessonContent` usa uma query com nested `!inner` joins:
```
course_lessons → course_modules!inner → courses!inner
```

Quando o PostgREST processa essa query, as policies RLS de **todas** as tabelas na chain devem permitir acesso. A policy RLS de `course_lessons` verifica:
- `access_level = 'all'` → **falha** (os cursos publicados são `access_level = 'reseller'`)
- enrollment do usuário → **só funciona se autenticado E matriculado**
- super_admin → **só para admins**

Se a sessão do usuário expirar ou houver qualquer falha na chain de RLS, `.single()` retorna erro, `lesson` fica `undefined`, e aparece "Aula não encontrada".

Enquanto isso, a listagem de aulas (`useModuleContent`) faz `select('*')` sem joins nested, o que é menos suscetível a falhas.

## Plano de correção

### 1. Simplificar query do `useLessonContent`
Dividir em 2 queries separadas em vez de nested `!inner` joins:
- Query 1: buscar a lesson por ID com `select('*')`
- Query 2: buscar o module com course info usando `module_id` da lesson

Isso evita a chain de RLS em joins nested.

### 2. Adicionar tratamento de erro com log
Adicionar `console.error` no `queryFn` do `useLessonContent` para logar erros RLS ao invés de silenciosamente retornar undefined.

### 3. Melhorar a mensagem de erro no LessonViewer
Quando `lesson` é null mas `lessonLoading` é false, mostrar uma mensagem mais informativa com sugestão de relogar, em vez de apenas "Aula não encontrada".

## Arquivos a editar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useLessonContent.ts` | Simplificar query, dividir em 2, adicionar error logging |
| `src/pages/customer/LessonViewer.tsx` | Melhorar mensagem de erro quando lesson não carrega |

