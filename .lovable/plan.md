## Plano: Aguardar resposta do webhook `order.paid` e sinalizar falha em vermelho

### Comportamento desejado
1. Disparar o webhook `order.paid` e **aguardar até 60 segundos** pela resposta do n8n.
2. Se a resposta for **HTTP 2xx**, marcar o pedido como "webhook enviado com sucesso".
3. Se a resposta for **erro, status >= 300 ou timeout**, marcar o pedido como "webhook falhou" — esse pedido aparecerá em **vermelho** na listagem `/super-admin/pedidos` para sinalizar que o envio para o n8n não foi confirmado.

### Mudanças

#### 1. Banco de dados (migration)
Adicionar 3 colunas em `orders`:
| Coluna | Tipo | Default | Função |
|---|---|---|---|
| `webhook_paid_status` | `text` | `null` | `null` (não disparado) / `sent` / `failed` |
| `webhook_paid_dispatched_at` | `timestamptz` | `null` | última tentativa |
| `webhook_paid_error` | `text` | `null` | mensagem de erro / status code para debug |

Sem CHECK constraint (apenas valores controlados pela edge function).

#### 2. `supabase/functions/dispatch-webhook/index.ts`
- Aumentar o timeout do `fetch` de **10s → 60s** (apenas para `order.paid`; outros eventos continuam 10s para não travar).
- Após o `fetch`, quando `event_type === 'order.paid'` e `!is_test` e `payload?.order_id`:
  - Se `statusCode >= 200 && statusCode < 300` → `update orders set webhook_paid_status='sent', webhook_paid_dispatched_at=now(), webhook_paid_error=null where id = order_id`.
  - Caso contrário → `update orders set webhook_paid_status='failed', webhook_paid_dispatched_at=now(), webhook_paid_error='<status> - <errorMessage|responseBody truncado>'`.
- Manter o registro em `webhook_dispatch_logs` (já existe).

> Observação: o disparo do `order.paid` continua chamado de dentro de `webhook-n8n-payment` e `dispatch-order-webhook` via `supabase.functions.invoke('dispatch-webhook', ...)`. Como `invoke` é assíncrono mas a função `dispatch-webhook` agora aguarda até 60s, a marcação do pedido fica garantida sem mudar os chamadores.

#### 3. UI — `/super-admin/pedidos` (`src/pages/admin/Orders.tsx` e componentes da lista)
- Incluir `webhook_paid_status` e `webhook_paid_error` no `select` da query de pedidos.
- Quando `webhook_paid_status === 'failed'`:
  - Aplicar uma classe vermelha discreta na linha (ex.: `bg-destructive/10 hover:bg-destructive/15`) usando token semântico.
  - Mostrar um badge pequeno "Webhook falhou" com tooltip exibindo `webhook_paid_error` e a `webhook_paid_dispatched_at`.
- Quando `webhook_paid_status === 'sent'`: nenhum destaque (comportamento atual).
- Pedidos antigos (status `null`) não são afetados visualmente.

### Arquivos
| Arquivo | Ação |
|---|---|
| migration SQL (novas colunas em `orders`) | criar |
| `supabase/functions/dispatch-webhook/index.ts` | timeout 60s + update do pedido após resposta |
| `src/pages/admin/Orders.tsx` (+ componente da linha/tabela) | incluir colunas no select e estilo vermelho + badge |

### Fora de escopo
- Retentativa automática (usuário optou por apenas sinalizar em vermelho).
- Notificação ao admin (não solicitado).
- Botão de reenvio dedicado — o reenvio manual já é possível via `dispatch-order-webhook` (existente).
