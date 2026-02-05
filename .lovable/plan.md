
# Plano: Criar Endpoint API para Gerar Link de Primeiro Acesso

## Resumo

Criar uma nova Edge Function `api-link-acesso-gerar` que gera links de primeiro acesso via API Key (para uso externo), seguindo o padrão dos outros endpoints de API, e documentá-la na categoria Usuários.

---

## Alterações

### 1. Nova Edge Function: `supabase/functions/api-link-acesso-gerar/index.ts`

Endpoint público que aceita autenticação via `X-API-Key` (igual aos outros endpoints da API):

```typescript
// Aceita X-API-Key (não Bearer JWT)
// Valida permissão usuarios.write
// Gera token único na tabela one_time_access_tokens
// Retorna link de primeiro acesso + data de expiração
```

**Parâmetros:**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `user_id` | string | Sim | UUID do usuário |
| `redirect_url` | string | Não | URL de redirecionamento (default: `/reseller/first-access`) |
| `expires_hours` | number | Não | Horas de validade (default: 24, máx: 168) |

---

### 2. Atualizar `supabase/config.toml`

```toml
[functions.api-link-acesso-gerar]
verify_jwt = false
```

---

### 3. Atualizar Documentação: `src/data/apiEndpointsData.ts`

Adicionar novo endpoint na categoria `usersEndpoints` (após "Alterar Role"):

```typescript
{
  title: 'Gerar Link de Primeiro Acesso',
  method: 'POST',
  url: '/functions/v1/api-link-acesso-gerar',
  description: 'Gera um link de acesso único para o usuário. O link permite login automático e direciona para a trilha de primeiro acesso.',
  headers: [
    { name: 'X-API-Key', description: 'Chave de API com permissão usuarios.write', example: 'sk_...', required: true }
  ],
  requestBody: {
    user_id: 'uuid-do-usuario',
    redirect_url: '/reseller/first-access',
    expires_hours: 24
  },
  responseExample: {
    success: true,
    data: {
      link: 'https://lojafy.lovable.app/auth/onetime?token=abc123',
      token: 'abc123-uuid',
      expires_at: '2026-02-06T12:00:00Z',
      expires_hours: 24,
      redirect_url: '/reseller/first-access'
    }
  },
  errorExamples: [
    { code: 400, title: 'user_id ausente', ... },
    { code: 401, title: 'API Key inválida', ... },
    { code: 403, title: 'Sem permissão', ... },
    { code: 404, title: 'Usuário não encontrado', ... }
  ]
}
```

---

## Fluxo da Edge Function

```text
┌─────────────────────────────────────────────────────┐
│  POST /functions/v1/api-link-acesso-gerar           │
│  Header: X-API-Key: sk_xxxx                         │
│  Body: { user_id, redirect_url?, expires_hours? }   │
└────────────────────────┬────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────┐
│  1. Validar X-API-Key na tabela api_keys            │
│  2. Verificar permissão usuarios.write              │
│  3. Verificar se user_id existe                     │
│  4. Gerar token UUID único                          │
│  5. Inserir em one_time_access_tokens               │
│  6. Retornar link + metadados                       │
└─────────────────────────────────────────────────────┘
```

---

## Resumo dos Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/api-link-acesso-gerar/index.ts` | Criar novo endpoint |
| `supabase/config.toml` | Registrar função |
| `src/data/apiEndpointsData.ts` | Adicionar documentação |

---

## Detalhes Técnicos

### Validação de API Key (padrão existente)

```typescript
const apiKey = req.headers.get('X-API-Key');
if (!apiKey) {
  return Response.json({ success: false, error: 'API Key não fornecida' }, { status: 401 });
}

const { data: keyData } = await supabase
  .from('api_keys')
  .select('*')
  .eq('key', apiKey)
  .eq('is_active', true)
  .single();

if (!keyData) {
  return Response.json({ success: false, error: 'API Key inválida ou inativa' }, { status: 401 });
}

if (!keyData.permissions?.includes('usuarios.write')) {
  return Response.json({ success: false, error: 'Permissão usuarios.write não concedida' }, { status: 403 });
}
```

### Geração do Token

```typescript
const token = crypto.randomUUID();
const expiresHours = Math.min(body.expires_hours || 24, 168); // máx 7 dias
const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000);

await supabase.from('one_time_access_tokens').insert({
  user_id: body.user_id,
  token,
  expires_at: expiresAt.toISOString(),
  redirect_url: body.redirect_url || '/reseller/first-access',
});
```
