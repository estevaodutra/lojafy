

# Plano: Adicionar Campo WhatsApp no Cadastro

## Resumo

Adicionar campo de WhatsApp com máscara brasileira no formulário de cadastro (aba "Cadastrar") da página de autenticação.

---

## Visual Proposto

```text
┌─────────────────────────────────────────────────────────────┐
│  Acessar sua conta                                          │
│  Entre ou crie uma conta para continuar                     │
├─────────────────────────────────────────────────────────────┤
│  [ Entrar ]  [ Cadastrar ]                                  │
├─────────────────────────────────────────────────────────────┤
│  Nome              Sobrenome                                │
│  [👤 João     ]    [Silva        ]                          │
│                                                             │
│  WhatsApp                              ← NOVO CAMPO         │
│  [📱 +55 (11) 99999-9999]                                   │
│                                                             │
│  Email                                                      │
│  [✉ seu@email.com]                                          │
│                                                             │
│  Confirmar Email                                            │
│  [✉ Repita seu email]                                       │
│                                                             │
│  Senha                                                      │
│  [🔒 ••••••••]                                              │
│                                                             │
│  Confirmar Senha                                            │
│  [🔒 ••••••••]                                              │
│                                                             │
│  [        Criar conta        ]                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Arquivo a Modificar

### `src/pages/Auth.tsx`

**Novos imports:**
```typescript
import { Phone } from 'lucide-react';
import { formatPhone } from '@/lib/phone';
```

**Novo state:**
```typescript
const [signupPhone, setSignupPhone] = useState('');
```

**Modificar função signUp no AuthContext:**
- A função `signUp` precisa aceitar o parâmetro `phone`
- Salvar o telefone no user_metadata ou no profile após criação

**Novo campo no formulário (após Nome/Sobrenome):**
```tsx
<div className="space-y-2">
  <Label htmlFor="signup-phone">WhatsApp</Label>
  <div className="relative">
    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
    <Input 
      id="signup-phone" 
      type="tel" 
      placeholder="+55 (11) 99999-9999" 
      value={signupPhone} 
      onChange={e => setSignupPhone(formatPhone(e.target.value))} 
      className="pl-10" 
      maxLength={19}
    />
  </div>
</div>
```

---

## Alterações no AuthContext

### `src/contexts/AuthContext.tsx`

**Modificar função signUp:**
```typescript
const signUp = async (
  email: string, 
  password: string, 
  firstName: string, 
  lastName: string,
  phone?: string  // Novo parâmetro opcional
) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/`,
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: phone || ''  // Salvar no user_metadata
      }
    }
  });
  // ... resto da lógica
};
```

**Atualizar trigger de criação de profile para incluir phone:**
- O phone será salvo no user_metadata e posteriormente sincronizado com a tabela profiles

---

## Chamada Atualizada no Auth.tsx

```typescript
const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ... validações existentes ...
  
  setIsLoading(true);
  const result = await signUp(
    signupEmail, 
    signupPassword, 
    firstName, 
    lastName,
    signupPhone  // Passar o telefone
  );
  
  // ... resto da lógica ...
};
```

---

## Ordem de Execução

1. Modificar `AuthContext.tsx` para aceitar parâmetro `phone` na função `signUp`
2. Modificar `Auth.tsx`:
   - Adicionar imports (`Phone`, `formatPhone`)
   - Adicionar state `signupPhone`
   - Adicionar campo WhatsApp no formulário
   - Atualizar chamada `handleSignup` para passar o telefone

