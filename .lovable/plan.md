

## Corrigir erro na clonagem - problema de CORS ou parsing da resposta

### Problema

O webhook do n8n respondeu com sucesso, mas o frontend mostra "Erro ao processar clonagem". Isso acontece porque a chamada `fetch` e feita diretamente do navegador para o n8n (`https://n8n-n8n.nuwfic.easypanel.host/webhook/clone_advertise`), o que causa erro de CORS - o navegador bloqueia a leitura da resposta mesmo que o servidor tenha processado o request.

Este e o mesmo problema que ja foi resolvido para a publicacao no Mercado Livre com a Edge Function `ml-publish-proxy`.

### Solucao

Criar uma Edge Function proxy (`clone-advertise-proxy`) que encaminha o payload para o webhook do n8n, contornando a restricao de CORS. O frontend chamara a Edge Function em vez do n8n diretamente.

### Alteracoes

**1. Nova Edge Function: `supabase/functions/clone-advertise-proxy/index.ts`**

- Recebe o payload do frontend via POST
- Encaminha para `https://n8n-n8n.nuwfic.easypanel.host/webhook/clone_advertise`
- Retorna a resposta do n8n para o frontend
- Inclui headers CORS adequados
- Sem verificacao JWT (mesmo padrao do `ml-publish-proxy`)

**2. Modificar: `src/components/admin/CloneFromMarketplace.tsx`**

- Trocar a chamada `fetch` direta ao n8n (linha 156-163) por `supabase.functions.invoke("clone-advertise-proxy", { body: payload })`
- Ajustar o parsing da resposta para funcionar com o retorno da Edge Function

**3. Atualizar: `supabase/config.toml`**

- Registrar a nova funcao `clone-advertise-proxy` com `verify_jwt = false`

### Secao Tecnica

**Fluxo corrigido:**
1. Frontend envia payload para Edge Function `clone-advertise-proxy`
2. Edge Function encaminha para webhook n8n (server-to-server, sem CORS)
3. n8n processa e retorna resposta
4. Edge Function retorna resposta para o frontend
5. Frontend faz parsing do resultado normalmente

A Edge Function seguira o mesmo padrao simples do `ml-publish-proxy` existente - proxy puro sem autenticacao.

