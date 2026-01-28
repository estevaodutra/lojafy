

# Plano: Corrigir Máscara de Telefone (Backspace)

## Problema

Quando o usuário apaga com backspace, o "55" do prefixo `+55` está sendo capturado como parte dos números do telefone, causando duplicação:
- Valor atual: `+55 (11) 9` 
- Após backspace: `+55 (55) 1...` (errado!)

## Causa

A função `formatPhone` remove todos os dígitos do valor (incluindo o "55" do prefixo) e só descarta o "55" se houver mais de 11 dígitos. Quando o campo tem poucos dígitos, o "55" é mantido e reaplicado.

## Solução

Modificar a lógica para **sempre** remover o prefixo "55" do início, independente do tamanho:

### Arquivo: `src/lib/phone.ts`

```typescript
export const formatPhone = (value: string): string => {
  // Remove tudo que não é dígito
  let numbers = value.replace(/\D/g, '');
  
  // SEMPRE remove 55 do início (é o código do país que já adicionamos)
  if (numbers.startsWith('55')) {
    numbers = numbers.substring(2);
  }
  
  // Limita a 11 dígitos (DDD + 9 dígitos)
  numbers = numbers.substring(0, 11);
  
  // Se não tiver números, retorna string vazia
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
```

## Comportamento Corrigido

| Ação | Antes (bug) | Depois (correto) |
|------|-------------|------------------|
| Digitar "11" | `+55 (11` | `+55 (11` |
| Backspace em `+55 (11` | `+55 (55) 1` | `+55 (1` |
| Apagar tudo | `+55 (55` | `` (vazio) |

## Arquivo a Modificar

- `src/lib/phone.ts` - linha 7: remover condição `&& numbers.length > 11`

