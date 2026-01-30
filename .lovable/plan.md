

# Plano: Link de Acesso Unico e Pagina de Onboarding com Video Obrigatorio

## Resumo

Este plano implementa tres funcionalidades interligadas:

1. **Link de acesso unico (one-time access token)** - Um link personalizado que faz login automatico, valido apenas para um clique
2. **Pagina de Onboarding para Revendedores** - Uma pagina com video obrigatorio que aparece no primeiro acesso
3. **Configuracao do Onboarding na Academy** - Uma nova aba "Onboarding" dentro da Lojafy Academy para gerenciar o conteudo

---

## Arquitetura Proposta

```text
┌─────────────────────────────────────────────────────────────────────┐
│                         FLUXO COMPLETO                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Super Admin gera link na tela de usuarios                      │
│     ↓                                                               │
│  2. Link: /auth/onetime?token=<uuid>                               │
│     ↓                                                               │
│  3. Edge function valida token e cria sessao                       │
│     ↓                                                               │
│  4. Token invalidado (usado = true)                                │
│     ↓                                                               │
│  5. Usuario redirecionado para /reseller/onboarding                │
│     ↓                                                               │
│  6. Pagina de Onboarding com video obrigatorio                     │
│     ↓                                                               │
│  7. Apos assistir, marca onboarding_completed e redireciona        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Banco de Dados

### Nova Tabela: `one_time_access_tokens`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria |
| user_id | uuid | Usuario alvo |
| token | text | Token unico (UUID v4) |
| used | boolean | Se ja foi utilizado |
| used_at | timestamp | Quando foi usado |
| expires_at | timestamp | Expiracao (24h por padrao) |
| created_by | uuid | Super admin que criou |
| created_at | timestamp | Data de criacao |
| redirect_url | text | Para onde redirecionar (default: /reseller/onboarding) |

**RLS Policies:**
- Super admins podem criar e visualizar
- Leitura publica apenas para validacao via edge function

### Nova Tabela: `reseller_onboarding_config`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | Chave primaria (single row) |
| title | text | Titulo da pagina |
| description | text | Texto descritivo |
| video_url | text | URL do video (YouTube/Vimeo/GDrive) |
| video_provider | text | youtube/vimeo/google_drive |
| video_aspect_ratio | text | 16:9 ou 9:16 |
| is_active | boolean | Se onboarding esta ativo |
| redirect_after | text | URL apos conclusao |
| created_at | timestamp | Data criacao |
| updated_at | timestamp | Ultima atualizacao |

### Alteracao em `profiles`

Adicionar coluna:
- `onboarding_completed` (boolean, default false)
- `onboarding_completed_at` (timestamp, nullable)

---

## 2. Edge Functions

### Nova: `generate-onetime-link`

Endpoint para gerar link de acesso unico:

```typescript
// Input: { user_id: string, redirect_url?: string }
// Output: { link: string, token: string, expires_at: string }

// Logica:
1. Verificar se chamador e super_admin
2. Gerar UUID v4 como token
3. Inserir em one_time_access_tokens
4. Retornar link completo: https://lojafy.lovable.app/auth/onetime?token=<token>
```

### Nova: `verify-onetime-link`

Endpoint para validar e processar o acesso:

```typescript
// Input: { token: string }
// Output: { success: boolean, session?: Session }

// Logica:
1. Buscar token na tabela
2. Verificar se nao usado e nao expirado
3. Marcar como usado (used=true, used_at=now)
4. Usar supabase.auth.admin.generateLink() para criar sessao
5. Retornar session/redirect_url
```

---

## 3. Pagina de Autenticacao One-Time

### Novo Arquivo: `src/pages/AuthOneTime.tsx`

```typescript
// Rota: /auth/onetime?token=<token>

// Comportamento:
1. Extrair token da URL
2. Chamar edge function verify-onetime-link
3. Se valido: fazer login, redirecionar para redirect_url
4. Se invalido: mostrar mensagem de erro
```

---

## 4. Pagina de Onboarding para Revendedores

### Novo Arquivo: `src/pages/reseller/Onboarding.tsx`

Pagina fullscreen com:
- Titulo configuravel
- Frame de video (YouTube/Vimeo/Google Drive)
- Descricao abaixo do video
- Botao "Continuar" (desabilitado ate assistir video)
- Logica de tracking similar a MandatoryNotificationModal

```typescript
// Componente reutiliza logica de video do MandatoryNotificationModal
// Detecta fim do video ou tempo minimo (30s para Google Drive)
// Apos conclusao:
1. Atualiza profiles.onboarding_completed = true
2. Redireciona para /reseller/dashboard ou redirect_after
```

---

## 5. Aba de Onboarding na Lojafy Academy

### Novo Componente: `src/components/admin/OnboardingSettings.tsx`

Formulario para configurar:
- Titulo da pagina
- Descricao (textarea)
- URL do video
- Provider (select: youtube/vimeo/google_drive)
- Aspect ratio (select: 16:9/9:16)
- Switch ativo/inativo
- URL de redirecionamento apos conclusao

### Integracao no Academy.tsx

Adicionar nova aba "Onboarding" no TabsList:

```tsx
<TabsTrigger value="onboarding">Onboarding</TabsTrigger>

<TabsContent value="onboarding">
  <OnboardingSettings />
</TabsContent>
```

---

## 6. Geracao de Link na Tela de Usuarios

### Alteracao em: `src/components/admin/UnifiedUsersTable.tsx` ou `UserDetailsModal.tsx`

Adicionar botao "Gerar Link de Acesso" no dropdown de acoes do usuario:
- Disponivel apenas para revendedores
- Abre modal de confirmacao
- Chama edge function e exibe link copiavel
- Mostra data de expiracao (24h)

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `supabase/migrations/xxx_one_time_access.sql` | Tabelas e RLS |
| `supabase/functions/generate-onetime-link/index.ts` | Gerar token |
| `supabase/functions/verify-onetime-link/index.ts` | Validar e logar |
| `src/pages/AuthOneTime.tsx` | Rota de acesso one-time |
| `src/pages/reseller/Onboarding.tsx` | Pagina de onboarding |
| `src/components/admin/OnboardingSettings.tsx` | Config na Academy |
| `src/hooks/useResellerOnboardingConfig.ts` | Hook para config |
| `src/components/admin/GenerateAccessLinkModal.tsx` | Modal para gerar link |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Adicionar rotas /auth/onetime e /reseller/onboarding |
| `src/pages/admin/Academy.tsx` | Adicionar aba Onboarding |
| `src/components/admin/UnifiedUsersTable.tsx` | Botao gerar link |
| `supabase/config.toml` | Registrar novas edge functions |
| `src/integrations/supabase/types.ts` | Tipos das novas tabelas |

---

## Fluxo Detalhado do Usuario

```text
1. Super Admin acessa /super-admin/clientes
2. Encontra usuario revendedor na lista
3. Clica em "Gerar Link de Acesso Unico"
4. Sistema gera link e exibe para copiar
5. Admin envia link para usuario (WhatsApp/Email)
6. Usuario clica no link (ex: /auth/onetime?token=abc123)
7. Sistema valida token, cria sessao, invalida token
8. Usuario e redirecionado para /reseller/onboarding
9. Pagina exibe video obrigatorio com titulo e descricao
10. Usuario assiste video ate o fim
11. Botao "Continuar" e habilitado
12. Usuario clica, sistema marca onboarding_completed=true
13. Usuario e redirecionado para /reseller/dashboard
```

---

## Protecao da Pagina de Onboarding

A rota `/reseller/onboarding` deve:
- Verificar se usuario esta autenticado e e revendedor
- Se `onboarding_completed = true`, redirecionar para dashboard
- Se config nao existe ou is_active=false, pular onboarding

---

## Consideracoes de Seguranca

1. **Tokens expiram em 24 horas** - Previne uso de links antigos
2. **Uso unico** - Apos primeiro acesso, token e invalidado
3. **Auditoria** - Registra quem criou o link e quando foi usado
4. **RLS** - Apenas super_admins podem gerar links
5. **Validacao no backend** - Edge function valida tudo server-side

