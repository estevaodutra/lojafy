

# Plano: Aplicar Máscara de Telefone Brasileiro

## Resumo

Criar função utilitária para formatação de telefone no padrão brasileiro (+55) e aplicar em todos os campos de telefone do sistema.

---

## Nova Função Utilitária

### Criar `src/lib/phone.ts`

```typescript
// Formata telefone para: +55 (XX) 98123-4567
export const formatPhone = (value: string): string => {
  // Remove tudo que não é dígito
  let numbers = value.replace(/\D/g, '');
  
  // Remove 55 do início se já existir (evita duplicação)
  if (numbers.startsWith('55') && numbers.length > 11) {
    numbers = numbers.substring(2);
  }
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  numbers = numbers.substring(0, 11);
  
  if (numbers.length === 0) return '';
  
  // Aplica a máscara progressivamente
  let formatted = '+55 ';
  
  if (numbers.length <= 2) {
    formatted += `(${numbers}`;
  } else if (numbers.length <= 7) {
    formatted += `(${numbers.substring(0, 2)}) ${numbers.substring(2)}`;
  } else {
    formatted += `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
  }
  
  return formatted;
};

// Remove formatação para salvar apenas números
export const cleanPhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Valida se tem 10 ou 11 dígitos (fixo ou celular)
export const validatePhone = (phone: string): boolean => {
  const numbers = cleanPhone(phone);
  return numbers.length >= 10 && numbers.length <= 11;
};
```

---

## Arquivos a Modificar

| Arquivo | Campo | Linha Aproximada |
|---------|-------|------------------|
| `src/pages/customer/Settings.tsx` | Telefone do perfil | ~334 |
| `src/components/admin/UserDetailsModal.tsx` | Telefone no modal admin | ~301 |
| `src/pages/Checkout.tsx` | Telefone do checkout | ~600 |
| `src/pages/reseller/StoreEditor.tsx` | Telefone da loja | ~320 |

---

## Detalhamento das Alterações

### 1. `src/pages/customer/Settings.tsx`

**Adicionar import:**
```typescript
import { formatPhone } from '@/lib/phone';
```

**Modificar input (linha ~334):**
```typescript
<Input
  id="phone"
  value={profile.phone}
  onChange={(e) => setProfile({...profile, phone: formatPhone(e.target.value)})}
  placeholder="+55 (11) 99999-9999"
  maxLength={19}
/>
```

### 2. `src/components/admin/UserDetailsModal.tsx`

**Adicionar import:**
```typescript
import { formatPhone } from '@/lib/phone';
```

**Modificar input (linha ~301):**
```typescript
<Input
  value={editedPhone}
  onChange={(e) => setEditedPhone(formatPhone(e.target.value))}
  type="tel"
  placeholder="+55 (00) 00000-0000"
  maxLength={19}
  className="max-w-[200px]"
/>
```

### 3. `src/pages/Checkout.tsx`

**Adicionar import:**
```typescript
import { formatPhone } from '@/lib/phone';
```

**Modificar handleInputChange ou input direto (linha ~600):**
```typescript
<Input 
  id="phone" 
  value={formData.phone} 
  onChange={e => handleInputChange("phone", formatPhone(e.target.value))} 
  placeholder="+55 (11) 99999-9999"
  maxLength={19}
/>
```

### 4. `src/pages/reseller/StoreEditor.tsx`

**Adicionar import:**
```typescript
import { formatPhone } from '@/lib/phone';
```

**Modificar input (linha ~320):**
```typescript
<Input
  id="phone"
  value={storeConfig.contactPhone}
  onChange={(e) => handleColorChange('contactPhone', formatPhone(e.target.value))}
  placeholder="+55 (00) 00000-0000"
  maxLength={19}
/>
```

---

## Comportamento da Máscara

| Digitado | Exibido |
|----------|---------|
| 1 | +55 (1 |
| 11 | +55 (11) |
| 119 | +55 (11) 9 |
| 11991 | +55 (11) 991 |
| 1199123 | +55 (11) 99123 |
| 11991234567 | +55 (11) 99123-4567 |

---

## Ordem de Execução

1. Criar arquivo `src/lib/phone.ts` com funções utilitárias
2. Modificar `Settings.tsx` (perfil do cliente)
3. Modificar `UserDetailsModal.tsx` (edição admin)
4. Modificar `Checkout.tsx` (formulário de checkout)
5. Modificar `StoreEditor.tsx` (configuração da loja)

