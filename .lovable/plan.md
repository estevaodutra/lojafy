

## Corrigir erro "Failed to fetch" na publicacao do Mercado Livre

### Problema
O navegador tenta chamar o webhook do n8n (`https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise`) diretamente do frontend. Isso causa erro "Failed to fetch" por CORS -- o servidor n8n nao permite requisicoes vindas do dominio do app.

### Solucao
Criar uma Edge Function proxy no Supabase (`ml-publish-proxy`) que recebe o payload do frontend e encaminha ao webhook do n8n. O frontend passa a chamar a Edge Function (mesmo dominio Supabase, sem CORS).

### Alteracoes

**1. Nova Edge Function: `supabase/functions/ml-publish-proxy/index.ts`**

- Recebe o payload via POST (requer autenticacao JWT do usuario logado)
- Valida que o usuario autenticado corresponde ao `user_id` do payload
- Encaminha a requisicao ao webhook n8n: `https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise`
- Retorna a resposta do webhook ao frontend
- Inclui tratamento de erros e timeout

Estrutura da funcao:
```text
1. Validar autenticacao (JWT)
2. Ler body do request
3. Verificar user_id == usuario autenticado
4. POST para o webhook n8n com o mesmo body
5. Retornar status + resposta do webhook
```

**2. Atualizar `src/hooks/useMercadoLivreIntegration.ts`**

Trocar a URL do fetch de:
```text
https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise
```
Para:
```text
supabase.functions.invoke('ml-publish-proxy', { body: payload })
```

Usar o metodo `supabase.functions.invoke()` que ja inclui o token JWT automaticamente e nao tem problemas de CORS.

### Resultado
- Sem problemas de CORS (a chamada vai para o mesmo dominio Supabase)
- O token JWT do usuario e enviado automaticamente
- Os dados sensiveis (access_token do ML) trafegam pelo backend, nao ficam expostos no console do navegador
- A Edge Function pode ser monitorada nos logs do Supabase
