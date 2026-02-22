
## Corrigir redirect_to do link de recuperacao de senha

### Problema
O link de recuperacao de senha esta usando `redirect_to=http://localhost:3000` porque o **Site URL** configurado no dashboard do Supabase ainda aponta para `http://localhost:3000`. A Edge Function passa `redirectTo: 'https://lojafy.app/reset-password'`, mas o Supabase usa o Site URL como base quando o redirect nao esta na lista de URLs permitidas.

### Solucao (configuracao no Supabase Dashboard)

Voce precisa atualizar duas configuracoes no Supabase Dashboard:

1. **Acessar**: Supabase Dashboard > Authentication > URL Configuration
2. **Site URL**: Alterar de `http://localhost:3000` para `https://lojafy.app`
3. **Redirect URLs**: Adicionar as seguintes URLs na lista de URLs permitidas:
   - `https://lojafy.app/**`
   - `https://lojafy.lovable.app/**`

### Por que isso acontece?
O Supabase Admin API (`generateLink`) valida o `redirectTo` contra a lista de Redirect URLs permitidas. Se a URL nao esta na lista, ele ignora o parametro e usa o Site URL padrao (`http://localhost:3000`). Por isso o link gerado tem `redirect_to=http://localhost:3000`.

### Passos
1. Acesse o Supabase Dashboard na secao Authentication > URL Configuration
2. Atualize o Site URL para `https://lojafy.app`
3. Adicione `https://lojafy.app/**` e `https://lojafy.lovable.app/**` na lista de Redirect URLs
4. Salve as alteracoes
5. Teste novamente o fluxo de reset de senha

### Resultado esperado
Apos a configuracao, os links de recuperacao virao com `redirect_to=https://lojafy.app/reset-password`.

Nenhuma alteracao de codigo e necessaria -- o problema e apenas de configuracao no dashboard.
