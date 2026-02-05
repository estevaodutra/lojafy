
# Plano: Simplificar Formulário de Criação de Usuário

## Objetivo

Reformular o `CreateUserDialog` removendo campos desnecessários, adicionando controles de plano/expiração/features e integrando webhook de pós-venda.

---

## Alterações

### Arquivo: `src/components/admin/CreateUserDialog.tsx`

**Reescrita completa do componente:**

#### 1. Novo Schema de Validação

```typescript
const formSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z.string().optional().refine(
    (val) => !val || cleanCPF(val).length === 11,
    'CPF deve ter 11 dígitos'
  ),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone obrigatório'),
  role: z.enum(['customer', 'reseller', 'supplier']),
  plan: z.enum(['free', 'premium']),
  expires_at: z.date({ required_error: 'Data de expiração obrigatória' }),
  features: z.array(z.string()).optional(),
  send_post_sale: z.boolean().default(true),
});
```

#### 2. Imports Adicionais

```typescript
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Mail, X } from 'lucide-react';
import { formatCPF, cleanCPF } from '@/lib/cpf';
import { formatPhone, cleanPhone, validatePhone } from '@/lib/phone';
```

#### 3. Query para Features

```typescript
const [features, setFeatures] = useState<{id: string, nome: string}[]>([]);

useEffect(() => {
  const fetchFeatures = async () => {
    const { data } = await supabase
      .from('features')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    if (data) setFeatures(data);
  };
  fetchFeatures();
}, []);
```

#### 4. Layout do Formulário

```
┌────────────────────────────────────────┐
│ Nome *                                 │
│ [input full width]                     │
├──────────────────┬─────────────────────┤
│ CPF              │ Email *             │
│ [input masked]   │ [input email]       │
├──────────────────┴─────────────────────┤
│ Telefone *                             │
│ [input masked]                         │
├──────────────────┬─────────────────────┤
│ Role *           │ Plano *             │
│ [select]         │ [select]            │
├──────────────────┴─────────────────────┤
│ Expiração *                            │
│ [date picker]                          │
├────────────────────────────────────────┤
│ Features                               │
│ [chips multi-select]                   │
├────────────────────────────────────────┤
│ ────────────────────────────────────── │
│ 📧 Enviar pós-venda           [toggle] │
│ Envia email e WhatsApp com link...     │
│ ────────────────────────────────────── │
├────────────────────────────────────────┤
│         [Cancelar]    [Criar Usuário]  │
└────────────────────────────────────────┘
```

#### 5. Lógica de Submissão

```typescript
const onSubmit = async (values: FormValues) => {
  setIsCreating(true);
  try {
    const tempPassword = generatePassword();
    const names = values.name.trim().split(' ');
    const firstName = names[0];
    const lastName = names.slice(1).join(' ') || '';

    // 1. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: values.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName },
    });
    if (authError) throw authError;

    // 2. Atualizar profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone: cleanPhone(values.phone),
        cpf: values.cpf ? cleanCPF(values.cpf) : null,
        role: values.role,
        subscription_plan: values.plan,
        subscription_expires_at: values.expires_at.toISOString(),
      })
      .eq('user_id', authData.user.id);
    if (profileError) throw profileError;

    // 3. Atribuir features selecionadas
    if (values.features && values.features.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      const featureInserts = values.features.map(featureId => ({
        user_id: authData.user.id,
        feature_id: featureId,
        status: 'ativo',
        tipo_periodo: 'mensal',
        data_inicio: new Date().toISOString(),
        data_expiracao: values.expires_at.toISOString(),
        atribuido_por: user?.id,
        motivo: 'Atribuição na criação do usuário',
      }));
      await supabase.from('user_features').insert(featureInserts);
    }

    // 4. Disparar webhook se toggle ativo
    if (values.send_post_sale) {
      try {
        const selectedPlan = values.plan === 'free' ? 'Free' : 'Premium';
        await fetch('https://n8n-n8n.nuwfic.easypanel.host/webhook/FN_onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            usuario_id: authData.user.id,
            nome: values.name,
            cpf: values.cpf ? cleanCPF(values.cpf) : null,
            email: values.email,
            telefone: cleanPhone(values.phone),
            role: values.role,
            plano_id: values.plan,
            plano_nome: selectedPlan,
            expiracao: values.expires_at.toISOString(),
            features: values.features || [],
            created_at: new Date().toISOString(),
          }),
        });
        toast({ title: 'Usuário criado!', description: 'Pós-venda enviado.' });
      } catch {
        toast({ 
          title: 'Usuário criado', 
          description: 'Falha ao enviar pós-venda', 
          variant: 'warning' 
        });
      }
    } else {
      toast({ title: 'Usuário criado com sucesso!' });
    }

    handleClose();
    if (onSuccess) onSuccess();
  } catch (error: any) {
    // Tratamento de erros específicos
    if (error.message?.includes('already')) {
      toast({ title: 'Este email já está cadastrado', variant: 'destructive' });
    } else {
      toast({ title: 'Erro ao criar usuário', description: error.message, variant: 'destructive' });
    }
  } finally {
    setIsCreating(false);
  }
};
```

---

## Máscaras de Input

| Campo | Formato Visual | Armazenado |
|-------|----------------|------------|
| CPF | 000.000.000-00 | 11 dígitos |
| Telefone | (00) 00000-0000 | 10-11 dígitos |

---

## Multi-Select de Features

```tsx
<div className="flex flex-wrap gap-2">
  {features.map((feature) => {
    const isSelected = selectedFeatures.includes(feature.id);
    return (
      <Badge
        key={feature.id}
        variant={isSelected ? "default" : "outline"}
        className="cursor-pointer"
        onClick={() => toggleFeature(feature.id)}
      >
        {feature.nome}
        {isSelected && <X className="ml-1 h-3 w-3" />}
      </Badge>
    );
  })}
</div>
```

---

## Toggle Pós-Venda

```tsx
<div className="border-t pt-4 mt-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Mail className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium">Enviar pós-venda</span>
    </div>
    <Switch
      checked={field.value}
      onCheckedChange={field.onChange}
    />
  </div>
  <p className="text-sm text-muted-foreground mt-1">
    Envia email e WhatsApp com link de acesso ao criar o usuário
  </p>
</div>
```

---

## Campos Removidos

| Campo | Motivo |
|-------|--------|
| Sobrenome | Unificado com Nome (split por espaço) |
| CNPJ | Desnecessário |
| Nome da Loja | Desnecessário |
| Endereço | Desnecessário |
| Aviso de senha | Removido (não mostra mais senha) |

---

## Campos Adicionados

| Campo | Tipo | Obrigatório |
|-------|------|-------------|
| Expiração | Date Picker | Sim |
| Features | Multi-select chips | Não |
| Enviar pós-venda | Switch | - (default: true) |

---

## Webhook Payload

```json
{
  "usuario_id": "uuid",
  "nome": "João Silva",
  "cpf": "12345678901",
  "email": "joao@email.com",
  "telefone": "11999887766",
  "role": "reseller",
  "plano_id": "premium",
  "plano_nome": "Premium",
  "expiracao": "2026-12-31T00:00:00.000Z",
  "features": ["uuid1", "uuid2"],
  "created_at": "2026-02-05T12:00:00.000Z"
}
```

---

## Resumo das Alterações

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Campos | 9 campos | 8 campos |
| Plano | Só para reseller | Para todos |
| Expiração | Não existia | Obrigatório |
| Features | Não existia | Multi-select |
| Pós-venda | Não existia | Toggle + webhook |
| Senha | Exibida após criar | Não exibida |
