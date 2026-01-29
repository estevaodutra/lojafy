

# Correção: Validação de Telefone Incluindo Código do País

## Problema Identificado

O número `+55 (12) 98144-3540` está correto, mas a validação está rejeitando porque:

| Função | Resultado | Problema |
|--------|-----------|----------|
| `cleanPhone("+55 (12) 98144-3540")` | `5512981443540` | Retorna **13 dígitos** |
| `validatePhone()` espera | 10-11 dígitos | **Falha na validação** |

A função `cleanPhone` remove apenas caracteres especiais mas **mantém o "55" do código do país**, enquanto a validação espera apenas DDD + número (10-11 dígitos).

---

## Solução

Atualizar a função `validatePhone` para aceitar números com ou sem o código do país:

### Arquivo: `src/lib/phone.ts`

**Antes:**
```typescript
export const validatePhone = (phone: string): boolean => {
  const numbers = cleanPhone(phone);
  return numbers.length >= 10 && numbers.length <= 11;
};
```

**Depois:**
```typescript
export const validatePhone = (phone: string): boolean => {
  let numbers = cleanPhone(phone);
  
  // Remove código do país 55 se presente para validação
  if (numbers.startsWith('55') && numbers.length >= 12) {
    numbers = numbers.substring(2);
  }
  
  // Valida se tem 10 (fixo) ou 11 (celular) dígitos
  return numbers.length >= 10 && numbers.length <= 11;
};
```

---

## Lógica de Validação

| Entrada | cleanPhone | Após remover 55 | Dígitos | Válido? |
|---------|------------|-----------------|---------|---------|
| `+55 (12) 98144-3540` | `5512981443540` | `12981443540` | 11 | ✅ |
| `(12) 98144-3540` | `12981443540` | `12981443540` | 11 | ✅ |
| `12981443540` | `12981443540` | `12981443540` | 11 | ✅ |
| `1298144354` | `1298144354` | `1298144354` | 10 | ✅ |
| `981443540` | `981443540` | `981443540` | 9 | ❌ |

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/lib/phone.ts` | Atualizar `validatePhone` para aceitar código do país |

