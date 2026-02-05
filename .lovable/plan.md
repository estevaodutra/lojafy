
# Plano: Corrigir Edge Function `api-link-acesso-gerar`

## Problema Identificado

A função `api-link-acesso-gerar` não está sendo deployada (erro 404) porque há incompatibilidade na chamada da função `logApiRequest`:

1. **Assinatura incorreta**: O código passa `(supabase, {...})` mas a função compartilhada espera apenas `({...})`
2. **Nomes de campos diferentes**: O código usa `camelCase` mas a interface usa `snake_case`

## Comparação

| Código atual (index.ts) | Interface esperada (_shared) |
|------------------------|------------------------------|
| `logApiRequest(supabase, { functionName, ... })` | `logApiRequest({ function_name, ... })` |
| `functionName` | `function_name` |
| `statusCode` | `status_code` |
| `durationMs` | `duration_ms` |
| `apiKeyId` | `api_key_id` |
| `errorMessage` | `error_message` |
| `requestBody` | `request_body` |
| `responseSummary` | `response_summary` |

## Solução

Atualizar `supabase/functions/api-link-acesso-gerar/index.ts` para:
1. Remover o primeiro parâmetro `supabase` de todas as chamadas `logApiRequest`
2. Converter todos os campos para `snake_case` conforme a interface `ApiLogData`

## Alterações

### Arquivo: `supabase/functions/api-link-acesso-gerar/index.ts`

**Exemplo de correção (linha 33-39):**
```typescript
// Antes
await logApiRequest(supabase, {
  functionName: 'api-link-acesso-gerar',
  method: 'POST',
  statusCode: 401,
  durationMs: Date.now() - startTime,
  errorMessage: 'API Key não fornecida',
});

// Depois
await logApiRequest({
  function_name: 'api-link-acesso-gerar',
  method: 'POST',
  status_code: 401,
  duration_ms: Date.now() - startTime,
  error_message: 'API Key não fornecida',
});
```

Esta correção deve ser aplicada em **todas as 8 chamadas** de `logApiRequest` no arquivo:
- Linha 33: API Key não fornecida
- Linha 55: API Key inválida
- Linha 73: Sem permissão
- Linha 97: user_id obrigatório
- Linha 120: Usuário não encontrado
- Linha 153: Erro ao inserir token
- Linha 187: Sucesso
- Linha 206: Erro interno

## Resumo

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/api-link-acesso-gerar/index.ts` | Corrigir assinatura e campos do `logApiRequest` |

Após esta correção, a função será deployada corretamente e o endpoint funcionará.
