
# Plano: Criar Edge Function para Cadastro de Usuários pelo Painel Admin

## Problema

O `CreateUserDialog.tsx` está chamando `supabase.auth.admin.createUser()` diretamente no frontend, mas essa função requer a **service role key** que não está disponível no cliente. O frontend usa apenas a `anon_key`, resultando no erro **"User not allowed"**.

---

## Solução

Criar uma nova Edge Function `admin-create-user` que:
1. Valida o JWT do usuário logado
2. Verifica se o usuário tem role `super_admin`
3. Usa a `SERVICE_ROLE_KEY` no backend para criar o usuário
4. Suporta atribuição de features e disparo do webhook de pós-venda

---

## Alterações

### 1. Nova Edge Function: `supabase/functions/admin-create-user/index.ts`

```typescript
// Autenticação via JWT (Bearer token)
// Verificação de role super_admin
// Criação do usuário com SERVICE_ROLE_KEY
// Atualização de profile, atribuição de features
// Disparo do webhook de pós-venda (opcional)
// Geração de access_link de uso único
```

**Parâmetros esperados:**
- `name` - Nome completo
- `email` - Email
- `phone` - Telefone
- `cpf` - CPF (opcional)
- `role` - customer | reseller | supplier
- `plan` - free | premium
- `expiration_period` - monthly | quarterly | semiannual | annual | lifetime
- `features` - Array de feature IDs
- `send_post_sale` - Boolean para disparar webhook

---

### 2. Atualizar `src/components/admin/CreateUserDialog.tsx`

**Antes (linha 144):**
```typescript
const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email: values.email,
  password: tempPassword,
  email_confirm: true,
  user_metadata: { first_name: firstName, last_name: lastName },
});
```

**Depois:**
```typescript
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: {
    name: values.name,
    email: values.email,
    phone: cleanPhone(values.phone),
    cpf: values.cpf ? cleanCPF(values.cpf) : null,
    role: values.role,
    plan: values.plan,
    expiration_period: values.expiration_period,
    features: selectedFeatures,
    send_post_sale: values.send_post_sale,
  }
});

if (error || !data.success) throw new Error(data?.error || error?.message);
```

---

### 3. Atualizar `supabase/config.toml`

Adicionar a nova função com `verify_jwt = false` (validação manual no código):

```toml
[functions.admin-create-user]
verify_jwt = false
```

---

## Fluxo Corrigido

```
┌─────────────────────────────────────────────────────────────┐
│              CreateUserDialog (Frontend)                    │
├─────────────────────────────────────────────────────────────┤
│  1. Coletar dados do formulário                             │
│  2. Chamar supabase.functions.invoke('admin-create-user')   │
│     → Envia Authorization: Bearer <JWT>                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              admin-create-user (Edge Function)              │
├─────────────────────────────────────────────────────────────┤
│  1. Validar JWT do requisitante                             │
│  2. Verificar role = super_admin                            │
│  3. Usar SERVICE_ROLE_KEY para:                             │
│     └─ supabase.auth.admin.createUser()                     │
│  4. Atualizar profile com dados adicionais                  │
│  5. Atribuir features selecionadas                          │
│  6. Gerar access_link de uso único                          │
│  7. Disparar webhook pós-venda (se habilitado)              │
│  8. Retornar dados do usuário criado                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Resumo dos Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/admin-create-user/index.ts` | Criar nova Edge Function |
| `supabase/config.toml` | Adicionar configuração da função |
| `src/components/admin/CreateUserDialog.tsx` | Substituir chamada direta por invoke da função |

---

## Seção Técnica

### Validação de Super Admin na Edge Function

```typescript
// Criar userClient para validar JWT
const userClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_ANON_KEY')!,
  { global: { headers: { Authorization: authHeader } } }
);

const { data: { user }, error: authError } = await userClient.auth.getUser();
if (authError || !user) {
  return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
}

// Verificar role super_admin
const { data: profile } = await adminClient
  .from('profiles')
  .select('role')
  .eq('user_id', user.id)
  .single();

if (profile?.role !== 'super_admin') {
  return Response.json({ success: false, error: 'Acesso negado' }, { status: 403 });
}
```

### Geração de Senha Temporária

```typescript
const generatePassword = () => {
  const year = new Date().getFullYear();
  const random = crypto.randomUUID().slice(0, 6).toUpperCase();
  return `LojaFy${year}@${random}`;
};
```

### Mapeamento de Período para Dias

```typescript
const periodToDays: Record<string, number | null> = {
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  annual: 365,
  lifetime: null,
};
```
