

# Atualizar Documentação da API — Novos Status de Pedidos

## O que está desatualizado

O arquivo `src/data/apiEndpointsData.ts` (linhas 310-361) mostra apenas 10 status e não documenta:
- 5 novos status: `pago`, `devolucao_solicitada`, `em_devolucao`, `troca_solicitada`, `em_troca`
- Campos obrigatórios por status: `cancelamento_motivo`, `cancelamento_observacao`, `devolucao_motivo`, `devolucao_observacao`, `troca_motivo`, `troca_observacao`
- Novas transições (ex: `finalizado → devolucao_solicitada, troca_solicitada`)

## Alterações

### `src/data/apiEndpointsData.ts` — endpoint "Atualizar Status do Pedido"

1. **`description`**: mencionar os 15 status e os campos de motivo/observação
2. **`requestBody`**: adicionar exemplos dos novos campos (`cancelamento_motivo`, `cancelamento_observacao`, `devolucao_motivo`, `devolucao_observacao`, `troca_motivo`, `troca_observacao`)
3. **`responseExample._status_disponiveis`**: adicionar os 5 novos status
4. **`responseExample._transicoes`**: atualizar com as novas transições (`pendente→pago`, `pago→recebido`, `finalizado→devolucao_solicitada/troca_solicitada`, etc.)
5. **`errorExamples`**: atualizar mensagem de "Status inválido" para listar os 15 status, e adicionar novos erros:
   - 400: `cancelamento_motivo` obrigatório para status `cancelado`
   - 400: `cancelamento_observacao` obrigatório quando motivo = `erro_pedido` ou `outro`
   - 400: `devolucao_motivo` obrigatório para `devolucao_solicitada`
   - 400: `troca_motivo` obrigatório para `troca_solicitada`

### Arquivo afetado
| Arquivo | Linhas | Ação |
|---------|--------|------|
| `src/data/apiEndpointsData.ts` | 314-361 | Atualizar endpoint com novos status, campos e transições |

