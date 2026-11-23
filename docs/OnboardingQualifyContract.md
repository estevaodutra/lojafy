# Integração de criação de grupo na Qualify

Este contrato define a chamada da Lojafy para a Qualify após o parceiro completar os dados pessoais. A URL é configurada em **Super Admin > Recursos > Onboarding**. A prévia do Super Admin já faz a chamada HTTP real com dados de teste; o fluxo automático de novos parceiros será implementado separadamente.

## Requisição

`POST` com `Content-Type: application/json`. O servidor da Lojafy envia uma chave de autenticação no cabeçalho `Authorization: Bearer <token>` quando a Qualify disponibilizar esse mecanismo. A chave fica apenas no servidor, nunca no navegador.

```json
{
  "request_id": "c05226a1-a069-467b-9cd3-1dd85a3b9d6d",
  "partner_id": "1dff0a09-9062-4450-8fa4-cfa7f141bd74",
  "name": "Ana Silva",
  "email": "ana@example.com",
  "phone": "+5511999999999",
  "cpf": "12345678909"
}
```

`partner_id` é o ID do usuário na Lojafy. `request_id` permanece igual nas tentativas de repetição da mesma criação; a Qualify deve devolver o mesmo grupo para esse ID, sem criar outro. O CPF só deve ser enviado se for necessário para a Qualify; sua validação na Lojafy ocorre antes da chamada.

Na prévia do Super Admin, `partner_id` é um UUID temporário gerado para o teste. O mesmo `request_id` é reutilizado quando o teste repete a chamada. A Qualify deve tratar esse par como idempotente.

## Resposta de sucesso da Qualify

Retornar HTTP `200` com JSON quando o grupo e o convite estiverem prontos:

```json
{
  "statusCode": 200,
  "responseBody": {
    "photoUrl": "https://qualify-supabase.d2x.site/storage/v1/object/public/sequence-media/companies/exemplo/image/foto.jpg",
    "groupName": "SUPORTE VIP | Ana Silva",
    "inviteLink": "https://chat.whatsapp.com/exemplo"
  }
}
```

`responseBody.groupName` e `responseBody.inviteLink` são obrigatórios. `photoUrl` pode ser omitido ou `null`. A resposta atual não fornece ID nem descrição do grupo; a Lojafy não exige esses campos para mostrar **Entrar no grupo**. O convite e a foto, quando informada, devem ser URLs HTTPS completas.

## Falhas e demora

- Se a Qualify ainda estiver criando o grupo, retornar HTTP `202` ou `statusCode: 202`. Para esse caso, ainda precisaremos definir um endpoint de consulta ou callback.
- Em erro, retornar HTTP `4xx` ou `5xx`, ou `statusCode` de erro com `responseBody.message` ou `responseBody.error`. O erro ficará visível para nova tentativa no painel.
- Uma resposta de sucesso sem `groupName` e `inviteLink` não será considerada criação concluída.
