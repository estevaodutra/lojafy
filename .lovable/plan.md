

## Remover autenticacao da Edge Function ml-publish-proxy

### Problema
A Edge Function `ml-publish-proxy` exige autenticacao JWT, mas o usuario quer que ela apenas repasse os dados ao webhook n8n sem validar tokens.

### Alteracao

**Arquivo: `supabase/functions/ml-publish-proxy/index.ts`**

Simplificar a funcao removendo toda a logica de autenticacao (getClaims, validacao de user_id, createClient). A funcao apenas:
1. Recebe o payload via POST
2. Encaminha ao webhook n8n
3. Retorna a resposta

```text
Deno.serve(async (req) => {
  // CORS preflight
  // Ler body
  // POST para WEBHOOK_URL com o body
  // Retornar resposta
})
```

Remove: import do supabase-js, createClient, authHeader, getClaims, validacao de user_id.

**Arquivo: `src/hooks/useMercadoLivreIntegration.ts`**

Nenhuma alteracao necessaria - o hook ja usa `supabase.functions.invoke()` que envia o token automaticamente, mas a funcao simplesmente vai ignorar. O payload continua o mesmo.

### Resultado
A Edge Function funciona como um proxy puro - recebe e encaminha sem verificar autenticacao.
