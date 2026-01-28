
# Plano: Reestruturar Listagem de Usuários

## Resumo das Alterações

Simplificar e reorganizar a tabela de usuários conforme solicitado, unificando colunas e centralizando ações em um menu dropdown.

---

## Alterações na Tabela

### Colunas Finais (Nova Estrutura)

| Coluna | Descrição |
|--------|-----------|
| Nome | Mantém |
| Email | Mantém |
| Telefone | Mantém |
| Role | Badge colorido (sem dropdown) |
| Features | Badge com contador |
| Pedidos | Mantém |
| Total Gasto | Mantém |
| Status | Unificado: Ativo/Inativo/Banido/Excluído com cores |
| Origem | NOVA: Lojafy ou nome da loja de origem |
| Ações | Menu dropdown único |

### Colunas Removidas
- ~~Alterar Role~~ (movido para modal)
- ~~Plano~~ (removido)
- ~~Atividade~~ (unificado com Status)
- ~~Criação~~ (removido)
- ~~Olho~~ (substituído por menu)

---

## Detalhamento das Mudanças

### 1. Coluna "Status" Unificada com Cores

```
Status atual + Atividade → Status único colorido:

• Verde (bg-green-100 text-green-800)  → "Ativo"
• Cinza (bg-gray-100 text-gray-800)    → "Inativo" / "Aguardando"
• Vermelho (bg-red-100 text-red-800)   → "Banido" / "Excluído"
• Laranja (bg-orange-100 text-orange-800) → "Expira em Xd"
```

### 2. Coluna "Origem" (Nova)

Mostra de onde o usuário veio:
- `origem_tipo = 'lojafy'` ou `null` → Badge "Lojafy" (azul)
- `origem_tipo = 'loja'` → Badge com nome da loja (verde)
- `origem_tipo = 'importado'` → Badge "Importado" (cinza)
- `origem_tipo = 'convite'` → Badge "Convite" (roxo)

### 3. Menu de Ações (Dropdown)

```
┌────────────────────────┐
│ ⋮  Ações               │
├────────────────────────┤
│ 👁️ Ver detalhes        │
│ ──────────────────────│
│ 🔄 Alterar role        │ (submenu com opções)
│ ⚡ Ativar/Desativar     │
│ 👤 Impersonar          │
│ ──────────────────────│
│ 🔓 Desbanir            │ (só se banido)
│ 🗑️ Excluir             │ (vermelho)
└────────────────────────┘
```

---

## Arquivos a Modificar

### 1. `src/components/admin/UnifiedUsersTable.tsx`

**Alterações:**
- Remover imports: `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Edit`, `Eye`, `PremiumBadge`
- Adicionar imports: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator`, `DropdownMenuSub`, `DropdownMenuSubContent`, `DropdownMenuSubTrigger`, `DropdownMenuTrigger`, `MoreHorizontal`, `Store`
- Remover colunas: "Alterar Role", "Plano", "Atividade", "Criação"
- Adicionar coluna: "Origem"
- Unificar Status + Atividade em uma única coluna colorida
- Substituir botões de ação por DropdownMenu
- Adicionar interface para dados de origem

**Interface atualizada:**
```typescript
interface UnifiedUser {
  // ... campos existentes ...
  origem_tipo?: 'lojafy' | 'loja' | 'importado' | 'convite';
  origem_loja_nome?: string;
}
```

### 2. `src/pages/admin/Clientes.tsx`

**Alterações:**
- Buscar dados de origem dos usuários (join com lojas se necessário)
- Passar dados de origem para a tabela
- Remover filtro de "Plano"

---

## Implementação do Menu de Ações

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <MoreHorizontal className="h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => onViewDetails(user)}>
      <Eye className="mr-2 h-4 w-4" />
      Ver detalhes
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Users className="mr-2 h-4 w-4" />
        Alterar role
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {roles.map(role => (
          <DropdownMenuItem 
            key={role.value}
            onClick={() => onUpdateRole(user.user_id, role.value)}
          >
            {role.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
    <DropdownMenuItem onClick={() => onToggleStatus(...)}>
      <Power className="mr-2 h-4 w-4" />
      {user.is_active ? 'Desativar' : 'Ativar'}
    </DropdownMenuItem>
    <ImpersonationMenuItem {...} />
    {isBanned && (
      <DropdownMenuItem onClick={() => onUnbanUser(user)}>
        <ShieldOff className="mr-2 h-4 w-4" />
        Desbanir
      </DropdownMenuItem>
    )}
    <DropdownMenuSeparator />
    <DropdownMenuItem 
      onClick={() => onDeleteUser(user)}
      className="text-destructive"
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Excluir
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## Cores do Status Unificado

```tsx
const getUnifiedStatus = (user) => {
  if (user.deleted_at) {
    return { label: 'Excluído', className: 'bg-red-100 text-red-800' };
  }
  if (isUserBanned(user.banned_until)) {
    return { label: 'Banido', className: 'bg-red-100 text-red-800' };
  }
  if (!user.is_active) {
    return { label: 'Inativo', className: 'bg-gray-100 text-gray-800' };
  }
  if (!user.last_sign_in_at) {
    return { label: 'Aguardando', className: 'bg-yellow-100 text-yellow-800' };
  }
  return { label: 'Ativo', className: 'bg-green-100 text-green-800' };
};
```

---

## Ordem de Execução

1. Modificar `UnifiedUsersTable.tsx` com nova estrutura de colunas
2. Implementar menu dropdown de ações
3. Adicionar coluna de origem
4. Modificar `Clientes.tsx` para buscar dados de origem
5. Remover filtro de plano
6. Ajustar colspan para "Nenhum usuário encontrado"

