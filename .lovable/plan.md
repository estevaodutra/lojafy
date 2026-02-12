

# Remover Validacao de Transicao da API de Status

## Problema

A API `api-pedidos-atualizar-status` valida transicoes de status (ex: `recebido` so pode ir para `em_preparacao`, `em_falta` ou `cancelado`), enquanto o painel admin na pagina de pedidos permite selecionar **qualquer** status diretamente sem restricao.

Isso causa confusao: o fornecedor/integrador usando a API recebe erros ao tentar colocar um status que no painel funciona normalmente.

## Solucao

Remover a validacao de transicao da Edge Function `api-pedidos-atualizar-status`, mantendo apenas a validacao de que o status informado eh um dos 10 status validos do sistema.

## Alteracao

### `supabase/functions/api-pedidos-atualizar-status/index.ts`

Remover o bloco de validacao de transicao (linhas 130-139):

```text
// REMOVER este bloco:
const allowedTransitions = STATUS_TRANSITIONS[order.status] || [];
if (!allowedTransitions.includes(status)) {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: `Transição não permitida: ${order.status} → ${status}...` 
    }),
    { status: 400, ... }
  );
}
```

Tambem remover a constante `STATUS_TRANSITIONS` (linhas 22-33) que nao sera mais utilizada.

A validacao que **permanece** eh a de status valido (linhas 106-113), que verifica se o status esta na lista `VALID_STATUSES`.

### Logica especial mantida

- Se status = `em_reposicao`, continua exigindo `previsao_envio`
- Se status = `em_falta`, continua desativando produtos vinculados
- Historico de status continua sendo registrado

### Documentacao (`src/data/apiEndpointsData.ts`)

Atualizar a documentacao do endpoint para remover qualquer mencao a transicoes obrigatorias, deixando claro que qualquer status valido pode ser informado.

## Resultado

A API passa a funcionar igual ao painel: aceita qualquer status valido dos 10 disponiveis, sem restricao de transicao.

