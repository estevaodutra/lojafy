
## Enviar Dados do Perfil no Webhook de Reset

### O que muda

Modificar a Edge Function `reset-password-proxy` para, apos gerar o link de recovery, buscar os dados do perfil do usuario na tabela `profiles` e incluir no payload enviado ao webhook n8n.

### Dados enviados ao webhook

O payload enviado para `lojafy_reset_password` passara de:

```json
{ "email": "...", "reset_link": "..." }
```

Para:

```json
{
  "email": "usuario@email.com",
  "reset_link": "https://...",
  "first_name": "Joao",
  "last_name": "Silva",
  "phone": "5511999999999",
  "cpf": "12345678900"
}
```

### Detalhes Tecnicos

**Arquivo modificado**: `supabase/functions/reset-password-proxy/index.ts`

Apos gerar o link de recovery (que ja retorna o `user.id` nos dados), adicionar uma consulta a tabela `profiles`:

```
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('first_name, last_name, phone, cpf')
  .eq('user_id', linkData.user.id)
  .single();
```

Incluir os campos `first_name`, `last_name`, `phone` e `cpf` no body do fetch para o webhook. Campos nulos serao enviados como `null`.

Nenhum outro arquivo precisa ser alterado.
