

# Plano: Matrícula Automática em Todos os Cursos (all_courses)

## Objetivo

Adicionar um parâmetro `all_courses` no endpoint `api-usuarios-cadastrar` que, quando `true`, matricula automaticamente o novo usuário em todos os cursos publicados da Lojafy Academy.

---

## Lógica

```
POST /api-usuarios-cadastrar
{
  "email": "usuario@email.com",
  "password": "senha123",
  "all_courses": true  ← NOVO
}
```

**Comportamento:**
1. Cria o usuário normalmente
2. Se `all_courses === true`:
   - Busca todos os cursos publicados (`is_published = true`)
   - Cria uma matrícula em cada curso para o novo usuário
   - Retorna a lista de cursos matriculados na resposta

---

## Alterações

### 1. Edge Function `api-usuarios-cadastrar/index.ts`

**Adicionar parâmetro:**
```typescript
const { 
  email, 
  full_name, 
  password, 
  role = 'customer',
  subscription_plan,
  subscription_days,
  subscription_expires_at,
  phone,
  all_courses  // NOVO: boolean
} = body;
```

**Após atualizar o perfil, adicionar lógica de matrícula:**
```typescript
// Matricular em todos os cursos se solicitado
let enrolledCourses: { course_id: string; title: string }[] = [];

if (all_courses === true) {
  // Buscar todos os cursos publicados
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, title')
    .eq('is_published', true);

  if (!coursesError && courses && courses.length > 0) {
    // Criar matrículas em lote
    const enrollments = courses.map(course => ({
      user_id: authData.user.id,
      course_id: course.id,
      expires_at: calculatedExpiresAt,  // Usar mesma expiração do perfil
      progress_percentage: 0
    }));

    const { error: enrollError } = await supabase
      .from('course_enrollments')
      .insert(enrollments);

    if (!enrollError) {
      enrolledCourses = courses.map(c => ({ 
        course_id: c.id, 
        title: c.title 
      }));
      console.log(`Usuário matriculado em ${courses.length} cursos`);
    } else {
      console.error('Erro ao matricular em cursos:', enrollError);
    }
  }
}
```

**Atualizar resposta:**
```typescript
return new Response(
  JSON.stringify({
    success: true,
    message: 'Usuário criado com sucesso',
    data: {
      user_id: authData.user.id,
      email: authData.user.email,
      full_name: full_name,
      role: role,
      subscription_plan: subscription_plan || 'free',
      subscription_expires_at: calculatedExpiresAt,
      subscription_days_granted: daysGranted,
      created_at: authData.user.created_at,
      enrolled_courses: enrolledCourses.length > 0 ? enrolledCourses : undefined,
      total_courses_enrolled: enrolledCourses.length || undefined
    }
  }),
  // ...
);
```

---

### 2. Documentação `src/data/apiEndpointsData.ts`

**Atualizar requestBody:**
```typescript
requestBody: {
  email: 'novo@email.com',
  full_name: 'Maria Santos',
  password: 'senhaSegura123!',
  role: 'reseller',
  phone: '11999999999',
  subscription_plan: 'premium',
  subscription_days: 30,
  all_courses: true,  // NOVO
  _nota: 'Use subscription_days OU subscription_expires_at (days tem prioridade)'
}
```

**Atualizar responseExample:**
```typescript
responseExample: {
  success: true,
  message: 'Usuário criado com sucesso',
  data: {
    user_id: 'uuid',
    email: 'novo@email.com',
    full_name: 'Maria Santos',
    role: 'reseller',
    subscription_plan: 'premium',
    subscription_expires_at: '2026-02-28T00:00:00Z',
    subscription_days_granted: 30,
    created_at: '2026-01-29T00:00:00Z',
    enrolled_courses: [
      { course_id: 'uuid1', title: 'Fundamentos de E-commerce' },
      { course_id: 'uuid2', title: 'Marketing Digital' }
    ],
    total_courses_enrolled: 2
  }
}
```

**Atualizar descrição:**
```typescript
description: 'Cria um novo usuário na plataforma. Use all_courses=true para matricular automaticamente em todos os cursos da Academy. A expiração das matrículas segue subscription_expires_at.'
```

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/api-usuarios-cadastrar/index.ts` | Adicionar lógica de matrícula automática |
| `src/data/apiEndpointsData.ts` | Atualizar documentação do endpoint |

---

## Tabela de Parâmetros Atualizada

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `email` | string | Sim | Email do usuário |
| `password` | string | Sim | Senha do usuário |
| `full_name` | string | Não | Nome completo |
| `role` | string | Não | Role (default: customer) |
| `phone` | string | Não | Telefone |
| `subscription_plan` | string | Não | Plano: free ou premium |
| `subscription_days` | number | Não | Dias de acesso a partir de hoje |
| `subscription_expires_at` | string | Não | Data fixa de expiração ISO |
| `all_courses` | boolean | Não | Se true, matricula em todos os cursos publicados |

---

## Exemplo de Uso Completo

```json
{
  "email": "aluno@email.com",
  "password": "senha123!",
  "full_name": "João Silva",
  "role": "reseller",
  "subscription_plan": "premium",
  "subscription_days": 365,
  "all_courses": true
}
```

**Resultado:**
- Usuário criado com plano premium
- Acesso válido por 365 dias
- Matriculado automaticamente em todos os cursos publicados
- Matrículas expiram junto com a assinatura do perfil

