

# Corrigir Exibicao de URL nos Eventos de Webhook

## Problema

O componente `EndpointCard` concatena a base URL do Supabase com `endpoint.url`, gerando URLs sem sentido para eventos de webhook (ex: `https://bbrmjrjorcgsgeztzbsr.supabase.coURL configurada pelo usuario`).

Eventos de webhook nao sao endpoints da API — sao payloads enviados para a URL que o usuario configura na secao de Webhooks (tabela `webhook_settings`).

## Correcao

### 1. `src/data/apiEndpointsData.ts`

Adicionar uma propriedade `isWebhookEvent: true` nos 3 endpoints de eventos (order.paid, user.created, user.inactive) para distingui-los dos endpoints normais da API.

### 2. `src/components/admin/EndpointCard.tsx`

Verificar se o endpoint tem `isWebhookEvent: true`. Se sim:
- Exibir o campo URL como texto informativo ("URL configurada pelo usuario na secao Webhooks") em vez de concatenar com a base URL do Supabase
- Ocultar o botao "Copiar URL" (nao faz sentido copiar uma URL generica)
- Ajustar o exemplo cURL para usar um placeholder como `https://sua-url-de-webhook.com/endpoint` em vez da URL concatenada errada

### 3. Ajuste no cURL e na secao de URL

Para eventos de webhook, o exemplo cURL mostrara:
```
curl -X POST "https://sua-url-de-webhook.com/endpoint" \
  -H "X-Webhook-Signature: hmac_sha256_hash" \
  -H "Content-Type: application/json" \
  -d '{ ... payload ... }'
```

Isso deixa claro que o sistema Lojafy envia o POST para a URL do usuario, e nao o contrario.

