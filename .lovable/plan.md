

# Implementação: Validação via Webhook antes do Cadastro

## Resumo

Adicionar chamada POST ao webhook de validação antes de criar a conta. Se dados inválidos, mostra mensagem pedindo para corrigir. O usuário pode corrigir e tentar novamente.

---

## Arquivo a Modificar

### `src/pages/Auth.tsx`

**Modificar função `handleSignup` (linhas 83-93)**

Adicionar validação externa entre `setIsLoading(true)` e a chamada `signUp()`:

```typescript
setIsLoading(true);

// Validação externa via webhook
try {
  const validationResponse = await fetch(
    'https://n8n-n8n.nuwfic.easypanel.host/webhook/lojafy_data_validation',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: signupEmail,
        phone: signupPhone,
        first_name: firstName,
        last_name: lastName,
      }),
    }
  );
  
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
  
} catch (error) {
  console.error('Erro na validação:', error);
  toast({ 
    title: 'Erro na validação', 
    description: 'Não foi possível validar seus dados. Tente novamente.',
    variant: 'destructive' 
  });
  setIsLoading(false);
  return;
}

// Se validação passou, prosseguir com o cadastro
const result = await signUp(signupEmail, signupPassword, firstName, lastName, signupPhone);
// ... resto do código existente
```

---

## Comportamento

| Cenário | Ação |
|---------|------|
| Email inválido | Toast com mensagem + formulário continua editável |
| Telefone inválido | Toast com mensagem + formulário continua editável |
| Erro de rede | Toast genérico + formulário continua editável |
| Dados válidos | Prossegue com cadastro normal |

O usuário pode corrigir os dados e clicar novamente em "Criar conta".

