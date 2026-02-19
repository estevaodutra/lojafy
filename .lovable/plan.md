

## Corrigir Clonagem de Marketplace sem Integracao Obrigatoria

### Problema

O componente `CloneFromMarketplace` exige uma integracao OAuth ativa do Mercado Livre para clonar dados de um anuncio. Porem, clonar dados de uma URL publica nao deveria exigir tokens de autenticacao - o webhook no n8n pode buscar os dados da pagina publica diretamente.

### Solucao

Remover a exigencia de integracao ativa para o fluxo de clonagem. O token de integracao sera enviado como opcional (se disponivel), mas sua ausencia nao bloqueara o processo.

### Alteracoes

**Arquivo: `src/components/admin/CloneFromMarketplace.tsx`**

1. Remover o bloco que bloqueia a execucao quando `integration` e `null` para o Mercado Livre (linhas 113-120)
2. Remover a verificacao de token expirado que tambem bloqueia (linhas 123-129)
3. Manter o envio do `integration` no payload, mas como valor opcional (`null` quando nao disponivel) - isso ja esta implementado corretamente no payload

### Secao Tecnica

O payload ja suporta `integration: null` (linha 152-160 do codigo atual). A unica mudanca e remover os dois blocos de validacao que impedem o envio quando nao ha integracao ativa. O webhook no n8n recebera `integration: null` e devera tratar esse caso buscando os dados via scraping/API publica.

