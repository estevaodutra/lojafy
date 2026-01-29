
# Plano: Corrigir Erro "email column not found in profiles"

## Problema

O modal de detalhes do usuário (`UserDetailsModal.tsx`) está tentando atualizar o campo `email` diretamente na tabela `profiles`, mas essa coluna não existe nessa tabela. O email está armazenado apenas na tabela `auth.users`.

**Código problemático (linhas 132-138):**
```typescript
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    email: editedEmail,  // ❌ Coluna não existe em profiles
    phone: editedPhone,
  })
  .eq('user_id', user.user_id);
```

---

## Solução

Remover a tentativa de atualizar o email na tabela `profiles`. O email é gerenciado pelo Supabase Auth e não deve ser editado diretamente via cliente. Para alterar email de usuários, seria necessário usar `supabase.auth.admin.updateUserById()` em uma Edge Function.

Por ora, vamos:
1. Remover o campo `email` do update de profiles
2. Desabilitar a edição de email na interface (tornar somente leitura)

---

## Alterações

### Arquivo: `src/components/admin/UserDetailsModal.tsx`

### 1. Remover `email` do update (linhas 132-138)

**De:**
```typescript
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    email: editedEmail,
    phone: editedPhone,
  })
  .eq('user_id', user.user_id);
```

**Para:**
```typescript
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    phone: editedPhone,
  })
  .eq('user_id', user.user_id);
```

### 2. Remover estado e detecção de mudança de email

**Linhas 98 e 107:** Remover `editedEmail` e `setEditedEmail`

**Linhas 118-119:** Remover comparação de email da detecção de mudanças

### 3. Tornar campo de email somente leitura (linhas 284-296)

**De:**
```tsx
<Input
  value={editedEmail}
  onChange={(e) => setEditedEmail(e.target.value)}
  type="email"
  className="max-w-[300px]"
/>
```

**Para:**
```tsx
<span className="text-sm">{user.email}</span>
```

---

## Código Final do handleSaveChanges

```typescript
const handleSaveChanges = async () => {
  if (!user) return;
  setIsSaving(true);
  try {
    // Update phone in profiles (email is managed by auth)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        phone: editedPhone,
      })
      .eq('user_id', user.user_id);

    if (profileError) throw profileError;

    // Update role if changed
    if (editedRole !== user.role) {
      // ... resto do código igual
    }

    toast({ title: 'Sucesso!', description: 'Informações atualizadas com sucesso' });
    onUserUpdated?.();
    setHasChanges(false);
  } catch (error: any) {
    toast({
      title: 'Erro',
      description: error.message || 'Falha ao atualizar informações',
      variant: 'destructive',
    });
  } finally {
    setIsSaving(false);
  }
};
```

---

## Resumo de Alterações

| Linha | Alteração |
|-------|-----------|
| 98 | Remover `const [editedEmail, setEditedEmail] = useState('');` |
| 107 | Remover `setEditedEmail(user.email);` |
| 118-119 | Remover comparação de email na detecção de mudanças |
| 134-135 | Remover `email: editedEmail,` do update |
| 290-293 | Substituir Input por texto estático para email |

---

## Por que não editar email?

O email é gerenciado pelo **Supabase Auth** e alterá-lo requer:
1. Edge Function com `supabase.auth.admin.updateUserById()`
2. Verificação de email duplicado
3. Envio de email de confirmação

Essa funcionalidade pode ser implementada futuramente se necessário.
