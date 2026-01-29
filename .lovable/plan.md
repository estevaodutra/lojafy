

# Plano: Transformar Lojafy Academy em Feature Controlada

## Contexto Atual

Atualmente a **Lojafy Academy** está acessível automaticamente para **todos os revendedores** (`role === 'reseller'`). A proposta é transformá-la em uma **feature controlada**, onde o acesso depende de ter a funcionalidade `lojafy_academy` atribuída ao usuário.

---

## Como Funciona o Sistema de Features

O sistema já possui duas features cadastradas:
- `loja_propria` - Loja Completa (categoria: loja)
- `top_10_produtos` - Top 10 Produtos (categoria: recursos)

Para verificar se um usuário tem uma feature, usa-se:
```typescript
const { hasFeature } = useFeature('slug_da_feature');
```

---

## Alterações Necessárias

### 1. Criar Feature no Banco de Dados

Inserir nova feature na tabela `features`:

| Campo | Valor |
|-------|-------|
| `slug` | `lojafy_academy` |
| `nome` | `Lojafy Academy` |
| `descricao` | `Acesso aos cursos e treinamentos da plataforma` |
| `icone` | `GraduationCap` |
| `categoria` | `recursos` |
| `ordem_exibicao` | `2` |
| `preco_mensal` | `0.00` (ou valor definido) |
| `trial_dias` | `0` |
| `ativo` | `true` |
| `roles_permitidas` | `['reseller', 'customer']` |
| `requer_features` | `[]` |

---

### 2. Atualizar Header.tsx

**Alterar condição de exibição do menu Academy:**

```typescript
// De (linhas 136-143 e 286-291):
{role === 'reseller' && (
  <Link to="/minha-conta/academy">...Lojafy Academy</Link>
)}

// Para:
{hasAcademyFeature && (
  <Link to="/minha-conta/academy">...Lojafy Academy</Link>
)}
```

**Adicionar hook:**
```typescript
const { hasFeature: hasAcademyFeature } = useFeature('lojafy_academy');
```

---

### 3. Atualizar CustomerLayout.tsx

**Alterar condição de exibição no menu lateral:**

```typescript
// De (linhas 29-32):
if (profile?.role === 'reseller') {
  items.push({ title: 'Lojafy Academy', url: '/minha-conta/academy', icon: GraduationCap });
}

// Para:
if (hasAcademyFeature) {
  items.push({ title: 'Lojafy Academy', url: '/minha-conta/academy', icon: GraduationCap });
}
```

**Adicionar hook:**
```typescript
const { hasFeature: hasAcademyFeature } = useFeature('lojafy_academy');
```

---

### 4. Proteger Rotas da Academy no App.tsx

**Envolver rotas relacionadas com FeatureRoute:**

```typescript
// De (linhas 232-237):
<Route path="academy" element={<Academy />} />
<Route path="curso/:courseId" element={<CourseModules />} />
<Route path="curso/:courseId/modulo/:moduleId" element={<ModuleLessons />} />
<Route path="aula/:lessonId" element={<LessonViewer />} />

// Para:
<Route path="academy" element={
  <FeatureRoute feature="lojafy_academy">
    <Academy />
  </FeatureRoute>
} />
<Route path="curso/:courseId" element={
  <FeatureRoute feature="lojafy_academy">
    <CourseModules />
  </FeatureRoute>
} />
<Route path="curso/:courseId/modulo/:moduleId" element={
  <FeatureRoute feature="lojafy_academy">
    <ModuleLessons />
  </FeatureRoute>
} />
<Route path="aula/:lessonId" element={
  <FeatureRoute feature="lojafy_academy">
    <LessonViewer />
  </FeatureRoute>
} />
```

---

## Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| **Banco de dados** | Inserir feature `lojafy_academy` |
| `src/components/Header.tsx` | Substituir `role === 'reseller'` por `hasAcademyFeature` |
| `src/components/customer/CustomerLayout.tsx` | Substituir `profile?.role === 'reseller'` por `hasAcademyFeature` |
| `src/App.tsx` | Proteger 4 rotas da Academy com `FeatureRoute` |

---

## Comportamento Após Implementação

1. **Usuário SEM feature:** Não vê links da Academy, acesso via URL é bloqueado
2. **Usuário COM feature:** Vê normalmente todos os links e tem acesso completo
3. **Super Admin:** Acesso liberado automaticamente (bypass no `useFeature`)

---

## Atribuição de Features

Para dar acesso à Academy para um usuário, o Super Admin pode:
1. Ir em **Features** > selecionar usuário > atribuir `lojafy_academy`
2. Usar a API `api-features-atribuir` com o slug `lojafy_academy`
3. Ao criar usuário via `api-usuarios-cadastrar` + `api-matriculas-cadastrar` com `all_courses: true`, também atribuir a feature

