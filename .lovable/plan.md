

# Correção: Validação em Cadeia - WhatsApp Primeiro

## Problema

A validação é em cadeia: se o WhatsApp é inválido, o email nem é validado. O webhook retorna:
```json
[{
  "success": true,
  "exists": false,   // WhatsApp não existe
  "phone": "5512983195531",
  "lid": null,
  "instance_used": "Mauro"
}]
```

Quando `exists: false`, deve mostrar "WhatsApp inválido. Por favor, forneça um novo número."

---

## Alteração

### `src/pages/Auth.tsx` (linhas 118-138)

**De:**
```typescript
const validationData = await validationResponse.json();

if (!validationData.email_valid) {
  toast({ 
    title: 'Email inválido', 
    description: validationData.reason || 'Por favor, verifique o email informado e tente novamente.',
    variant: 'destructive' 
  });
  setIsLoading(false);
  return;
}

if (!validationData.phone) {
  toast({ 
    title: 'Telefone inválido', 
    description: validationData.reason || 'Por favor, verifique o número de WhatsApp e tente novamente.',
    variant: 'destructive' 
  });
  setIsLoading(false);
  return;
}
```

**Para:**
```typescript
const validationData = await validationResponse.json();

// Resposta é um array - pegar o primeiro item
const validation = Array.isArray(validationData) ? validationData[0] : validationData;

// Validação em cadeia: primeiro WhatsApp, depois email
// Se WhatsApp não existe, email nem foi validado
if (validation.exists === false) {
  toast({ 
    title: 'WhatsApp inválido', 
    description: 'Por favor, forneça um novo número.',
    variant: 'destructive' 
  });
  setIsLoading(false);
  return;
}

// Se WhatsApp válido mas email inválido (caso o webhook retorne)
if (validation.email_valid === false) {
  toast({ 
    title: 'Email inválido', 
    description: validation.reason || 'Por favor, verifique o email informado e tente novamente.',
    variant: 'destructive' 
  });
  setIsLoading(false);
  return;
}
```

---

## Fluxo de Validação

```
Usuário clica "Criar conta"
        ↓
Validação local do nono dígito
        ↓
Webhook recebe email + telefone
        ↓
    ┌─────────────────────────────────┐
    │ WhatsApp existe?                │
    │   exists: false → Erro WhatsApp │
    │   exists: true  → Próximo passo │
    └─────────────────────────────────┘
        ↓ (se WhatsApp OK)
    ┌─────────────────────────────────┐
    │ Email válido?                   │
    │   email_valid: false → Erro     │
    │   email_valid: true  → Cadastro │
    └─────────────────────────────────┘
```

---

## Mensagens de Erro

| Situação | Mensagem |
|----------|----------|
| WhatsApp não existe | "WhatsApp inválido. Por favor, forneça um novo número." |
| Email inválido | "Email inválido. Por favor, verifique o email informado e tente novamente." |

