

# Plano: Tornar Role, Email e Telefone Editáveis no Modal de Detalhes

## Resumo

Transformar os campos de Role, Email e Telefone em campos editáveis no modal de detalhes do usuário, permitindo que o admin atualize essas informações diretamente.

---

## Alterações no Modal

### Visual Proposto

```text
┌─────────────────────────────────────────────────────────────────┐
│  👤 Detalhes do Usuário                                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Informações Pessoais                                    │   │
│  │                                                         │   │
│  │ 👤 João Silva                                           │   │
│  │                                                         │   │
│  │ Role:     [▼ Revendedor        ]  ← SELECT EDITÁVEL     │   │
│  │                                                         │   │
│  │ Email:    [joao@email.com      ]  ← INPUT EDITÁVEL      │   │
│  │                                                         │   │
│  │ Telefone: [(11) 99999-9999     ]  ← INPUT EDITÁVEL      │   │
│  │                                                         │   │
│  │ 📅 Cliente desde 15/01/2026                             │   │
│  │ 🕐 Último acesso: 28/01/2026 às 14:30                   │   │
│  │ 🆔 abc123... [📋]                                       │   │
│  │                                                         │   │
│  │                              [💾 Salvar Alterações]     │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ...                                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Arquivo a Modificar

### `src/components/admin/UserDetailsModal.tsx`

**Novos imports:**
```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCog, Save, Loader2 } from 'lucide-react';
```

**Novos states:**
```typescript
const [editedEmail, setEditedEmail] = useState(user?.email || '');
const [editedPhone, setEditedPhone] = useState(user?.phone || '');
const [editedRole, setEditedRole] = useState(user?.role || 'customer');
const [isSaving, setIsSaving] = useState(false);
const [hasChanges, setHasChanges] = useState(false);
```

**Nova prop na interface:**
```typescript
interface UserDetailsModalProps {
  user: {...} | null;
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: () => void; // Para refresh da lista após salvar
}
```

**Constante de roles:**
```typescript
const ROLES = [
  { value: 'customer', label: 'Cliente' },
  { value: 'reseller', label: 'Revendedor' },
  { value: 'supplier', label: 'Fornecedor' },
  { value: 'admin', label: 'Admin' },
  { value: 'super_admin', label: 'Super Admin' },
];
```

**Função de salvar:**
```typescript
const handleSaveChanges = async () => {
  if (!user) return;
  setIsSaving(true);
  try {
    // Atualizar email/phone no profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        email: editedEmail,
        phone: editedPhone 
      })
      .eq('user_id', user.user_id);

    if (profileError) throw profileError;

    // Atualizar role se mudou
    if (editedRole !== user.role) {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: editedRole })
        .eq('user_id', user.user_id);

      if (roleError) throw roleError;
    }

    toast({
      title: 'Sucesso!',
      description: 'Informações atualizadas com sucesso',
    });

    onUserUpdated?.();
    setHasChanges(false);
  } catch (error) {
    toast({
      title: 'Erro',
      description: 'Falha ao atualizar informações',
      variant: 'destructive',
    });
  } finally {
    setIsSaving(false);
  }
};
```

**Atualizar useEffect para sincronizar states:**
```typescript
useEffect(() => {
  if (user && isOpen) {
    setEditedEmail(user.email);
    setEditedPhone(user.phone || '');
    setEditedRole(user.role);
    setHasChanges(false);
    fetchUserDetails();
  }
}, [user, isOpen]);
```

**Detectar mudanças:**
```typescript
useEffect(() => {
  if (user) {
    const changed = 
      editedEmail !== user.email || 
      editedPhone !== (user.phone || '') || 
      editedRole !== user.role;
    setHasChanges(changed);
  }
}, [editedEmail, editedPhone, editedRole, user]);
```

---

## Nova Estrutura do Card "Informações Pessoais"

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Informações Pessoais</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Nome (não editável) */}
    <div className="flex items-center gap-2">
      <Users className="w-4 h-4 text-muted-foreground" />
      <span className="font-medium">
        {user.first_name} {user.last_name}
      </span>
    </div>

    {/* Role (editável) */}
    <div className="grid grid-cols-[100px_1fr] items-center gap-2">
      <Label className="flex items-center gap-2">
        <UserCog className="w-4 h-4 text-muted-foreground" />
        Role
      </Label>
      <Select value={editedRole} onValueChange={setEditedRole}>
        <SelectTrigger className="w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map(role => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>

    {/* Email (editável) */}
    <div className="grid grid-cols-[100px_1fr] items-center gap-2">
      <Label className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-muted-foreground" />
        Email
      </Label>
      <Input 
        value={editedEmail}
        onChange={(e) => setEditedEmail(e.target.value)}
        type="email"
        className="max-w-[300px]"
      />
    </div>

    {/* Telefone (editável) */}
    <div className="grid grid-cols-[100px_1fr] items-center gap-2">
      <Label className="flex items-center gap-2">
        <Phone className="w-4 h-4 text-muted-foreground" />
        Telefone
      </Label>
      <Input 
        value={editedPhone}
        onChange={(e) => setEditedPhone(e.target.value)}
        type="tel"
        placeholder="(00) 00000-0000"
        className="max-w-[200px]"
      />
    </div>

    {/* Informações não editáveis */}
    <div className="flex items-center gap-2 pt-2 border-t">
      <Calendar className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        Cliente desde {format(...)}
      </span>
    </div>

    {user.last_sign_in_at && (
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Último acesso: {format(...)}
        </span>
      </div>
    )}

    {/* ID */}
    <div className="flex items-center gap-2">
      <IdCard className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-mono text-muted-foreground truncate max-w-[200px]">
        {user.user_id}
      </span>
      <Button variant="ghost" size="sm" ...>
        <Copy className="w-3 h-3" />
      </Button>
    </div>

    {/* Botão Salvar */}
    {hasChanges && (
      <div className="flex justify-end pt-2 border-t">
        <Button 
          onClick={handleSaveChanges} 
          disabled={isSaving}
          size="sm"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Salvar Alterações
        </Button>
      </div>
    )}
  </CardContent>
</Card>
```

---

## Alterações Adicionais

### `src/pages/admin/Clientes.tsx`

Passar callback `onUserUpdated` para o modal para recarregar a lista após salvar:

```tsx
<UserDetailsModal
  user={selectedUser}
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  onUserUpdated={() => refetchUsers()}
/>
```

### `src/components/admin/UnifiedUsersTable.tsx`

Remover o submenu "Alterar role" do dropdown de ações (já que agora está no modal).

---

## Ordem de Execução

1. Modificar `UserDetailsModal.tsx` com campos editáveis e lógica de salvamento
2. Atualizar `Clientes.tsx` para passar callback de atualização
3. Remover submenu de role do `UnifiedUsersTable.tsx`

