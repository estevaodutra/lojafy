

# Plano: Enviar Telefone Sem Máscara e Validar Nono Dígito

## Resumo

Modificar o envio do telefone para o webhook: remover máscara, enviar apenas números completos (com código do país 55) e validar se celular tem o nono dígito.

---

## Alterações

### `src/pages/Auth.tsx`

**1. Importar a função `cleanPhone`:**
```typescript
import { formatPhone, cleanPhone } from '@/lib/phone';
```

**2. Modificar o envio no `handleSignup`:**

Antes:
```typescript
body: JSON.stringify({
  email: signupEmail,
  phone: signupPhone,  // "+55 (11) 99999-9999"
  first_name: firstName,
  last_name: lastName,
}),
```

Depois:
```typescript
body: JSON.stringify({
  email: signupEmail,
  phone: cleanPhone(signupPhone),  // "5511999999999"
  first_name: firstName,
  last_name: lastName,
}),
```

**3. Adicionar validação do nono dígito antes do envio:**

```typescript
// Validar nono dígito (celulares brasileiros começam com 9 após o DDD)
const phoneNumbers = cleanPhone(signupPhone);
if (phoneNumbers.length === 13) { // 55 + DDD(2) + número(9)
  const firstDigitAfterDDD = phoneNumbers.charAt(4); // posição após 55XX
  if (firstDigitAfterDDD !== '9') {
    toast({ 
      title: 'Telefone inválido', 
      description: 'Celulares devem começar com 9 após o DDD.',
      variant: 'destructive' 
    });
    return;
  }
}
```

---

## Formato do Telefone Enviado

| Usuário digita | Exibido no campo | Enviado ao webhook |
|----------------|------------------|-------------------|
| 11999998888 | +55 (11) 99999-8888 | 5511999998888 |

---

## Validação do Nono Dígito

- Celulares brasileiros: 13 dígitos (55 + DDD + 9 + 8 dígitos)
- O terceiro dígito após o DDD deve ser `9`
- Exemplo válido: `5511999998888` ✓
- Exemplo inválido: `5511899998888` ✗

