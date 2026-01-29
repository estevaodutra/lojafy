
# Plano: Atualizar Documentação do Endpoint Matricular Usuário

## Contexto

O endpoint `api-matriculas-cadastrar` foi atualizado para suportar o parâmetro `all_courses`, mas a documentação em `apiEndpointsData.ts` não reflete essa mudança.

---

## Alteração

### Arquivo: `src/data/apiEndpointsData.ts`

**Linhas 404-418** - Atualizar o endpoint "Matricular Usuário":

```typescript
{
  title: 'Matricular Usuário',
  method: 'POST',
  url: '/functions/v1/api-matriculas-cadastrar',
  description: 'Matricula um usuário em um curso específico ou em todos os cursos publicados (all_courses: true).',
  requestBody: {
    user_id: 'user123',
    course_id: 'course456',
    expires_at: '2026-01-12T23:59:59Z',
    all_courses: false,
    _nota: 'Use course_id para curso específico OU all_courses: true para todos os cursos publicados'
  },
  responseExample: {
    success: true,
    message: 'Matrícula realizada com sucesso',
    _exemplo_all_courses: {
      success: true,
      message: 'Matrícula realizada em 5 cursos',
      data: {
        total_enrolled: 5,
        enrolled_courses: [
          { course_id: 'uuid1', title: 'Fundamentos de E-commerce' },
          { course_id: 'uuid2', title: 'Marketing Digital' }
        ],
        skipped_existing: 2
      }
    }
  }
}
```

---

## Resumo

| Campo | Valor |
|-------|-------|
| Arquivo | `src/data/apiEndpointsData.ts` |
| Linhas | 404-418 |
| Alteração | Adicionar `all_courses` no requestBody e atualizar description/responseExample |
