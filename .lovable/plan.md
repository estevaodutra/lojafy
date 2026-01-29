
# Plano: Exibir Data de Expiração nos Detalhes do Usuário

## Contexto

O modal de detalhes do usuário (`UserDetailsModal`) não exibe os campos `subscription_plan` e `subscription_expires_at`, embora esses dados já sejam retornados pela RPC `get_users_with_email` e passados para o modal.

---

## Alterações

### Arquivo: `src/components/admin/UserDetailsModal.tsx`

### 1. Atualizar a interface `UserDetailsModalProps`

Adicionar os campos de assinatura:

```typescript
interface UserDetailsModalProps {
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    created_at: string;
    last_sign_in_at?: string;
    role: string;
    subscription_plan?: string;        // NOVO
    subscription_expires_at?: string;  // NOVO
  } | null;
  // ...
}
```

### 2. Importar ícone adicional

Adicionar `CreditCard` ou `CalendarClock` para representar assinatura:

```typescript
import { CalendarClock } from 'lucide-react';
```

### 3. Adicionar exibição no render

Após a exibição do telefone, adicionar seção de assinatura:

```tsx
{/* Assinatura */}
<div className="grid grid-cols-[100px_1fr] items-center gap-2">
  <Label className="flex items-center gap-2 text-sm">
    <CalendarClock className="w-4 h-4 text-muted-foreground" />
    Plano
  </Label>
  <div className="flex items-center gap-2">
    <Badge variant={user.subscription_plan === 'premium' ? 'default' : 'secondary'}>
      {user.subscription_plan === 'premium' ? 'Premium' : 'Free'}
    </Badge>
  </div>
</div>

{/* Data de Expiração */}
{user.subscription_expires_at && (
  <div className="grid grid-cols-[100px_1fr] items-center gap-2">
    <Label className="flex items-center gap-2 text-sm">
      <Clock className="w-4 h-4 text-muted-foreground" />
      Expira em
    </Label>
    <div className="flex items-center gap-2">
      <span className={cn(
        "text-sm",
        new Date(user.subscription_expires_at) < new Date() 
          ? "text-destructive" 
          : "text-foreground"
      )}>
        {format(new Date(user.subscription_expires_at), "dd/MM/yyyy", { locale: ptBR })}
      </span>
      {new Date(user.subscription_expires_at) < new Date() && (
        <Badge variant="destructive" className="text-xs">Expirado</Badge>
      )}
    </div>
  </div>
)}

{!user.subscription_expires_at && user.subscription_plan === 'premium' && (
  <div className="grid grid-cols-[100px_1fr] items-center gap-2">
    <Label className="flex items-center gap-2 text-sm">
      <Clock className="w-4 h-4 text-muted-foreground" />
      Expira em
    </Label>
    <Badge variant="outline" className="text-xs w-fit">Vitalício</Badge>
  </div>
)}
```

### 4. Importar utilitário `cn`

```typescript
import { cn } from '@/lib/utils';
```

---

## Visualização Final

```
┌─────────────────────────────────────────────────┐
│ Detalhes do Usuário                             │
├─────────────────────────────────────────────────┤
│ Informações Pessoais                            │
│                                                 │
│ 👤 Henrique de Jesus                            │
│                                                 │
│ Role      [Revendedor ▼]                        │
│ Email     [centraldeerros2@gmail.com]           │
│ Telefone  [5512982402981           ]            │
│ Plano     🏷️ Premium                            │
│ Expira em 28/02/2026                            │  ← NOVO
│                                                 │
│ ─────────────────────────────────────────────── │
│ 📅 Cliente desde 29/01/2026                     │
│ 🆔 0995398d-805f-47ed-8ac5-... [📋]             │
└─────────────────────────────────────────────────┘
```

---

## Resumo de Alterações

| Linha | Alteração |
|-------|-----------|
| ~5-17 | Adicionar import `CalendarClock` |
| ~50-59 | Adicionar campos na interface `user` |
| ~295-330 | Adicionar exibição de Plano e Data de Expiração |
| ~1 | Adicionar import `cn` de utils |
