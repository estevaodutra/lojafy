

# Plano: Corrigir Limite de Caracteres no Campo de Telefone

## Problema Identificado

O campo de telefone no `CreateUserDialog.tsx` tem `maxLength={15}`, mas o formato completo `+55 (XX) XXXXX-XXXX` requer **19 caracteres**.

**Contagem de caracteres:**
| Parte | Exemplo | Caracteres |
|-------|---------|------------|
| Código país | `+55 ` | 4 |
| DDD | `(41) ` | 5 |
| Número | `98821-3373` | 10 |
| **Total** | `+55 (41) 98821-3373` | **19** |

---

## Solução

Alterar o `maxLength` de `15` para `19` no campo de telefone.

---

## Alteração

### Arquivo: `src/components/admin/CreateUserDialog.tsx`

**Linha 304:**
```tsx
// Antes
maxLength={15}

// Depois
maxLength={19}
```

---

## Resumo

| Local | Alteração |
|-------|-----------|
| Linha 304 | `maxLength={15}` → `maxLength={19}` |

