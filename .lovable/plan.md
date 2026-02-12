
# Criar Categoria "Pagamentos" na Documentacao da API

## Resumo

Adicionar uma nova categoria **Pagamentos** na documentacao da API com o endpoint `POST /api/pagamentos/webhook` (webhook-n8n-payment). Inclui documentacao completa de request/response, tabela de mapeamento de status do gateway para status Lojafy, e exemplos de erro.

---

## Alteracoes

### 1. `src/data/apiEndpointsData.ts`

Criar o array `paymentsEndpoints` com um endpoint:

- **POST webhook-n8n-payment** - Recebe notificacao de pagamento e atualiza o status do pedido
  - Headers: Content-Type application/json
  - Request body: paymentId, status, amount, external_reference
  - Query params: nenhum
  - Response 200: success com dados do pedido atualizado (pedido_id, status_anterior, status_novo, payment_id)
  - Erros: 400 (validacao), 404 (pedido nao encontrado), 500 (erro interno)

Adicionar a categoria no array `apiEndpointsData`:
```
{
  id: 'payments',
  title: 'Pagamentos',
  endpoints: paymentsEndpoints
}
```

### 2. `src/components/admin/ApiDocsSidebar.tsx`

Adicionar icone para a nova categoria no mapa `categoryIcons`:
```
payments: CreditCard
```

Importar `CreditCard` do lucide-react.

### 3. `src/components/admin/ApiDocsContent.tsx`

Adicionar case `payments` na funcao `getCategoryTitle`:
```
case 'payments': return {
  title: 'Endpoints de Pagamentos',
  desc: 'Integracoes com gateways de pagamento para atualizacao automatica de status de pedidos'
};
```

### 4. `src/components/admin/ApiDocsContent.tsx` - Secao Introducao

Adicionar card de "Pagamentos" na grid de categorias da IntroSection, com icone de cartao e descricao "Webhooks de gateways de pagamento".

---

## Detalhes Tecnicos

### Endpoint documentado

```
POST /functions/v1/webhook-n8n-payment
```

### Campos do request body

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| paymentId | string | Nao | ID do pagamento no gateway |
| status | string | Sim | Status do pagamento (approved, pending, rejected, etc.) |
| amount | number | Nao | Valor pago |
| external_reference | string | Sim | Referencia do pedido na Lojafy |

### Mapeamento de status

| Status Recebido | Acao na Lojafy |
|-----------------|----------------|
| approved | Pedido -> recebido (pago) |
| pending | Pedido permanece pendente |
| in_process | Pedido permanece pendente |
| rejected | Pedido -> cancelado |
| refunded | Pedido -> reembolsado |
| cancelled | Pedido -> cancelado |

### Exemplos de erro documentados

- 400: Campo external_reference obrigatorio
- 404: Pedido nao encontrado
- 500: Erro ao processar pagamento

Nenhuma alteracao de banco de dados e necessaria - o endpoint webhook-n8n-payment ja existe e funciona. Esta e apenas uma alteracao de documentacao.
