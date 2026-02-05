
# Plano: Simplificar Seleção de Expiração com Períodos Predefinidos

## Resumo

Substituir o calendário de seleção de data por um dropdown com opções de período predefinidas, calculando a data automaticamente com base na data de criação.

---

## Alterações

### Arquivo: `src/components/admin/CreateUserDialog.tsx`

#### 1. Alterar o schema do formulário (linha 57)

```typescript
// Antes
expires_at: z.date({ required_error: 'Data de expiração obrigatória' }),

// Depois
expiration_period: z.enum(['monthly', 'quarterly', 'semiannual', 'annual', 'lifetime'], {
  required_error: 'Período de expiração obrigatório'
}),
```

#### 2. Adicionar função para calcular data de expiração

```typescript
const calculateExpirationDate = (period: string): Date | null => {
  const now = new Date();
  switch (period) {
    case 'monthly':
      return new Date(now.setMonth(now.getMonth() + 1));
    case 'quarterly':
      return new Date(now.setMonth(now.getMonth() + 3));
    case 'semiannual':
      return new Date(now.setMonth(now.getMonth() + 6));
    case 'annual':
      return new Date(now.setFullYear(now.getFullYear() + 1));
    case 'lifetime':
      return null; // Vitalício = sem expiração
    default:
      return null;
  }
};
```

#### 3. Substituir o campo de calendário (linhas 360-400) por Select

```tsx
<FormField
  control={form.control}
  name="expiration_period"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Período de Expiração *</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="monthly">📅 Mensal (30 dias)</SelectItem>
          <SelectItem value="quarterly">📅 Trimestral (3 meses)</SelectItem>
          <SelectItem value="semiannual">📅 Semestral (6 meses)</SelectItem>
          <SelectItem value="annual">📅 Anual (12 meses)</SelectItem>
          <SelectItem value="lifetime">♾️ Vitalício</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

#### 4. Atualizar o onSubmit para calcular a data

```typescript
// No onSubmit, calcular a data baseada no período selecionado
const expirationDate = calculateExpirationDate(values.expiration_period);

// Atualizar profile com expiração (null para vitalício)
const { error: profileError } = await supabase
  .from('profiles')
  .update({
    // ... outros campos
    subscription_expires_at: expirationDate?.toISOString() || null,
  })
  .eq('user_id', authData.user.id);
```

#### 5. Remover imports não utilizados

```typescript
// Remover (não mais necessários):
import { CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
```

---

## Mapeamento de Períodos

| Opção | Valor | Cálculo |
|-------|-------|---------|
| Mensal | `monthly` | Data atual + 1 mês |
| Trimestral | `quarterly` | Data atual + 3 meses |
| Semestral | `semiannual` | Data atual + 6 meses |
| Anual | `annual` | Data atual + 12 meses |
| Vitalício | `lifetime` | `null` (sem expiração) |

---

## Resumo das Alterações

| Componente | Antes | Depois |
|------------|-------|--------|
| Campo | Calendar picker | Select dropdown |
| Schema | `expires_at: z.date()` | `expiration_period: z.enum([...])` |
| Valor salvo | Data selecionada | Data calculada automaticamente |
| Vitalício | Não disponível | `subscription_expires_at = null` |
