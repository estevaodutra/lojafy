

# Documentar Webhooks e Logs na API Documentation

## Resumo

Adicionar uma nova categoria "Webhooks & Logs" no `apiEndpointsData.ts` com documentacao completa dos endpoints de webhook (dispatch-webhook, webhook-n8n-payment) e informacoes sobre o sistema de logs. Tambem atualizar o conteudo da pagina para exibir documentacao tecnica junto com os componentes interativos existentes (WebhooksSection e ApiLogsSection).

---

## Alteracoes

### 1. `src/data/apiEndpointsData.ts`

Adicionar nova categoria `webhooks` com subcategorias:

**Subcategoria: Eventos Disponiveis**
- Documentacao dos 5 tipos de eventos (order.paid, user.created, user.inactive.7days/15days/30days)
- Payload de exemplo para cada evento
- Headers enviados (X-Webhook-Signature, X-Webhook-Event, X-Webhook-Timestamp)

**Subcategoria: Endpoints de Webhook**
- **POST dispatch-webhook** - Dispara webhook manualmente ou via sistema
  - Parametros: event_type, payload, is_test, use_real_data
  - Exemplo de resposta com status_code e success
- **POST webhook-n8n-payment** - Recebe notificacoes de pagamento do N8N
  - Parametros: paymentId, status, amount, external_reference
  - Exemplo de resposta

**Subcategoria: Logs**
- **GET api_request_logs** - Descricao da tabela de logs de requisicoes (campos, retencao de 7 dias)
- **GET webhook_dispatch_logs** - Descricao da tabela de logs de webhooks (campos, retencao de 7 dias)

### 2. `src/components/admin/ApiDocsContent.tsx`

Atualizar as secoes `webhooks` e `logs` para incluir a documentacao tecnica (EndpointCards) ACIMA dos componentes interativos existentes (WebhooksSection e ApiLogsSection):

- Secao `webhooks`: Renderizar documentacao dos eventos e endpoints + componente WebhooksSection (gerenciamento) abaixo
- Secao `logs`: Renderizar documentacao das tabelas de logs + componente ApiLogsSection (visualizacao) abaixo

### 3. `src/components/admin/ApiDocsSidebar.tsx`

Adicionar a nova categoria `webhooks-docs` no menu lateral abaixo dos endpoints existentes, com icone Zap e subcategorias expandiveis mostrando os endpoints documentados.

Alternativamente (mais simples): manter os itens estaticos `webhooks` e `logs` existentes no sidebar e apenas enriquecer o conteudo renderizado.

---

## Detalhes Tecnicos

### Payload order.paid (exemplo documentacao)
```json
{
  "event": "order.paid",
  "timestamp": "2026-02-12T14:45:44Z",
  "data": {
    "order_id": "uuid",
    "order_number": "ORD-123",
    "total_amount": 199.90,
    "payment_id": "145209389269",
    "customer": {
      "name": "Maria Santos",
      "email": "maria@email.com"
    },
    "items": [
      { "name": "Produto X", "sku": "SKU-001", "quantity": 2, "unit_price": 99.95 }
    ],
    "shipping_label_url": "https://...signed-url (7 dias)"
  }
}
```

### Validacao HMAC-SHA256 (ja documentada na WebhooksSection, sera replicada na doc)
```
Header: X-Webhook-Signature
Algoritmo: HMAC-SHA256(payload_json, secret_token)
```

### Estrutura dos logs (retencao 7 dias)
- **api_request_logs**: function_name, method, path, api_key_id, status_code, duration_ms, request_body, response_summary
- **webhook_dispatch_logs**: event_type, payload, status_code, response_body, error_message, dispatched_at

### Abordagem escolhida
Manter os itens `webhooks` e `logs` no sidebar como estao. Atualizar o `ApiDocsContent` para renderizar a documentacao tecnica (cards de endpoint com payloads, headers, exemplos de resposta) seguida dos componentes interativos existentes. Isso combina documentacao + gerenciamento na mesma pagina.

