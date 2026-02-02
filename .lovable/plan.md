
## Diagnóstico (por que está dando erro 500 ao atualizar)
- O endpoint `/functions/v1/api-pedidos-atualizar-status` passou a **receber status em português** (ex.: `em_preparacao`).
- Porém, a tabela `orders` ainda possui uma **check constraint** (`orders_status_check`) permitindo apenas os status em inglês:
  - `pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`
- Resultado: ao tentar salvar `em_preparacao` em `orders.status`, o Postgres rejeita e a Edge Function retorna 500 (“Erro ao atualizar pedido”).

## Objetivo da correção
Manter a API externa com os status em português (como você definiu), mas **persistir no banco os status internos em inglês** (que são os que a tabela `orders` aceita hoje). Assim:
- A API continua aceitando/mostrando: `pendente`, `em_preparacao`, `despachado`, `finalizado`, `cancelado`, `reembolsado`
- O banco continua armazenando: `pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`
- Evitamos quebrar outras funções já existentes (ex.: `create-pix-payment`, webhooks de pagamento) que ainda gravam `pending/processing/...`.

## Mudanças a implementar

### 1) Ajustar a Edge Function para fazer “tradução” de status
**Arquivo:** `supabase/functions/api-pedidos-atualizar-status/index.ts`

**Ajustes:**
1. Manter `VALID_STATUSES` com os 6 status em português.
2. Criar um mapa de conversão:
   - `pendente` -> `pending`
   - `em_preparacao` -> `processing`
   - `despachado` -> `shipped`
   - `finalizado` -> `delivered`
   - `cancelado` -> `cancelled`
   - `reembolsado` -> `refunded`
3. Antes de atualizar `orders`, converter:
   - `internalStatus = map[status]`
   - salvar `internalStatus` na coluna `orders.status`
4. Para a resposta da API e para logs:
   - Converter `previousStatus` (que vem do banco em inglês) para a forma em português ao retornar ao cliente.
   - Retornar `previous_status` e `new_status` em português (consistência da API).
5. Inserção em `order_status_history`:
   - Registrar o `status` **interno** (inglês) para manter consistência com o dado real em `orders`.
   - Usar `notes` para registrar a informação “status via API: {pt}”.

**Melhoria opcional (recomendado):**
- Se o update falhar com `code: 23514` (check constraint), retornar **400** com uma mensagem explícita sobre status inválido para evitar “500 genérico”.

### 2) Atualizar a documentação para refletir o comportamento correto
**Arquivo:** `src/data/apiEndpointsData.ts`

**Ajustes:**
1. Manter a lista `_status_disponiveis` e exemplos com status em português.
2. Atualizar o `responseExample` para continuar mostrando `previous_status/new_status` em português (porque o endpoint vai responder assim).
3. (Recomendado) Acrescentar uma linha curta na `description` do endpoint deixando claro:
   - “A API recebe status em PT-BR; internamente o sistema mapeia para os status do banco.”

## Como vamos validar (checklist)
1. Chamar o endpoint com:
   - `status: "em_preparacao"` e confirmar retorno 200.
2. Verificar no banco (`orders.status`) que foi salvo como `processing`.
3. Confirmar que o JSON de resposta mostra:
   - `new_status: "em_preparacao"` (português).
4. Testar também `despachado`, `finalizado`, etc.

## Observações importantes
- Esta abordagem é a mais segura agora porque evita quebrar:
  - criação de pedido (`create-pix-payment` grava `pending`)
  - webhooks (`webhook-mercadopago` / `webhook-n8n-payment` gravam `processing/cancelled/...`)
- Se no futuro você quiser que o banco também armazene tudo em português, aí sim faremos uma migração no Postgres (alterar `orders_status_check` + atualizar dados existentes + ajustar webhooks/criação). Mas isso é uma mudança maior.

## Arquivos envolvidos (resumo)
- Editar: `supabase/functions/api-pedidos-atualizar-status/index.ts`
- Editar: `src/data/apiEndpointsData.ts`
