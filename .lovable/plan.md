

# Plano: Corrigir Pedidos que Ficam "Pendente" Após Pagamento

## Diagnóstico do Problema

Analisando o código, identifiquei que os **webhooks estão implementados corretamente**:

| Edge Function | Comportamento |
|---------------|---------------|
| `create-pix-payment` | Cria pedido com `status: 'pending'` (correto - aguardando pagamento) |
| `webhook-n8n-payment` | Quando recebe `status: 'approved'` → atualiza para `processing` |
| `webhook-mercadopago` | Quando recebe `status: 'approved'` → atualiza para `processing` |

**O problema:** O N8N não está chamando o webhook `webhook-n8n-payment` quando o pagamento PIX é confirmado.

---

## Duas Soluções Possíveis

### Solução 1: Configurar o N8N (Recomendada - Ação Manual)

O workflow do N8N precisa ter um nó adicional que, após receber a confirmação de pagamento do Mercado Pago, faça uma chamada HTTP POST para:

```text
URL: https://bbrmjrjorcgsgeztzbsr.supabase.co/functions/v1/webhook-n8n-payment

Body (JSON):
{
  "paymentId": "{{paymentId do MP}}",
  "status": "approved",
  "amount": {{valor}},
  "external_reference": "{{external_reference}}"
}
```

---

### Solução 2: Adicionar Verificação Ativa de Pagamento (Código)

Criar uma Edge Function que verifica periodicamente os pedidos pendentes no Mercado Pago e atualiza automaticamente.

**Arquivos a criar:**

1. **`supabase/functions/check-pending-payments/index.ts`**
   - Busca pedidos com `status = 'pending'` e `payment_status = 'pending'`
   - Para cada pedido, consulta a API do Mercado Pago usando o `payment_id`
   - Se o pagamento estiver `approved`, atualiza o pedido para `processing`
   - Pode ser chamado periodicamente via CRON ou manualmente

**Alterações no `supabase/config.toml`:**
```toml
[functions.check-pending-payments]
verify_jwt = false
```

---

## Fluxo Atual vs Esperado

```text
ATUAL (problema):
1. Cliente gera PIX → pedido criado como "pending"
2. Cliente paga PIX no app do banco
3. Mercado Pago confirma pagamento
4. N8N recebe confirmação mas NÃO chama webhook
5. Pedido permanece "Pendente" ❌

ESPERADO (com correção):
1. Cliente gera PIX → pedido criado como "pending"
2. Cliente paga PIX no app do banco
3. Mercado Pago confirma pagamento
4. N8N recebe confirmação e CHAMA webhook-n8n-payment
5. Pedido atualizado para "Em preparação" ✅
```

---

## Recomendação

A **Solução 1 (configurar N8N)** é a mais apropriada pois:
- O sistema já está preparado para receber a confirmação
- Apenas precisa configurar o N8N para enviar a notificação
- É mais eficiente (push) do que verificar periodicamente (poll)

Se preferir a **Solução 2** como fallback de segurança, posso implementar a Edge Function de verificação.

---

## Resumo

| Item | Descrição |
|------|-----------|
| **Causa raiz** | N8N não está chamando o webhook de confirmação |
| **Solução principal** | Configurar nó HTTP no N8N para POST em `webhook-n8n-payment` |
| **Solução alternativa** | Criar Edge Function `check-pending-payments` para verificar via API do MP |

